import * as cloudinit from "@pulumi/cloudinit";
import * as metal from "@pulumi/equinix-metal";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import * as tls from "@pulumi/tls";
import * as fs from "fs";

type ControlPlaneNode = metal.Device;

export interface ControlPlaneConfig {
  name: string;
  kubernetesVersion: string;
  highlyAvailable: boolean;
  metro: string;
  plan: metal.Plan;
  project: string;
}

export interface ControlPlane {
  ipAddress: pulumi.Output<string>;
  joinToken: pulumi.Output<string>;
  certificatePrivateKey: pulumi.Output<string>;
  certificateCert: pulumi.Output<string>;
}

export const createControlPlane = (
  config: ControlPlaneConfig
): ControlPlane => {
  const privateKey = new tls.PrivateKey("certificateAuthority", {
    algorithm: "RSA",
    rsaBits: 2048,
  });

  const certificateAuthority = new tls.SelfSignedCert("certificateAuthority", {
    keyAlgorithm: "RSA",
    validityPeriodHours: 87600,
    earlyRenewalHours: 168,
    isCaCertificate: true,
    privateKeyPem: privateKey.privateKeyPem,
    allowedUses: ["cert_signing", "digital_signature", "key_encipherment"],
    subjects: [
      {
        commonName: config.name,
      },
    ],
  });

  const joinTokenLeft = new random.RandomString("joinTokenLeft", {
    length: 6,
    special: false,
    lower: true,
    number: true,
    upper: false,
  });

  const joinTokenRight = new random.RandomString("joinTokenRight", {
    length: 16,
    special: false,
    lower: true,
    number: true,
    upper: false,
  });

  const ip = new metal.ReservedIpBlock(`${config.name}-control-plane`, {
    projectId: config.project,
    metro: config.metro,
    type: "public_ipv4",
    quantity: 1,
  });

  const controlPlane: ControlPlane = {
    ipAddress: ip.address,
    joinToken: pulumi.interpolate`${joinTokenLeft.result}.${joinTokenRight.result}`,
    certificatePrivateKey: privateKey.privateKeyPem,
    certificateCert: certificateAuthority.certPem,
  };

  const controlPlane1: ControlPlaneNode = createControlPlaneNode(
    1,
    config,
    controlPlane,
    []
  );

  if (config.highlyAvailable) {
    const controlPlane2: ControlPlaneNode = createControlPlaneNode(
      2,
      config,
      controlPlane,
      [controlPlane1]
    );
    const controlPlane3: ControlPlaneNode = createControlPlaneNode(
      3,
      config,
      controlPlane,
      [controlPlane2]
    );
  }

  return controlPlane;
};

const createControlPlaneNode = (
  number: Number,
  config: ControlPlaneConfig,
  controlPlane: ControlPlane,
  dependsOn: ControlPlaneNode[]
): ControlPlaneNode => {
  const cloudConfig = cloudinit.getConfig({
    gzip: false,
    base64Encode: false,
    parts: [
      {
        contentType: "text/x-shellscript",
        content: fs.readFileSync(
          "../../cloud-init/scripts/wait-for-bgp-enabled.sh",
          "utf8"
        ),
      },
      {
        contentType: "text/x-shellscript",
        content: fs.readFileSync(
          "../../cloud-init/scripts/download-metadata.sh",
          "utf8"
        ),
      },
      {
        contentType: "text/x-shellscript",
        content: fs.readFileSync(
          "../../cloud-init/scripts/add-bgp-routes.sh",
          "utf8"
        ),
      },
      {
        contentType: "text/x-shellscript",
        content: fs.readFileSync(
          "../../cloud-init/scripts/base-packages.sh",
          "utf8"
        ),
      },
      {
        contentType: "text/x-shellscript",
        content: fs.readFileSync(
          "../../cloud-init/scripts/containerd.sh",
          "utf8"
        ),
      },
      {
        contentType: "text/x-shellscript",
        content: fs.readFileSync(
          "../../cloud-init/scripts/kube-vip.sh",
          "utf8"
        ),
      },
      {
        contentType: "text/x-shellscript",
        content: fs.readFileSync(
          "../../cloud-init/scripts/kubernetes-prerequisites.sh",
          "utf8"
        ),
      },
      {
        contentType: "text/x-shellscript",
        content: fs.readFileSync(
          "../../cloud-init/scripts/kubernetes-packages.sh",
          "utf8"
        ),
      },
      {
        contentType: "text/x-shellscript",
        content: fs.readFileSync(
          "../../cloud-init/scripts/kubernetes-init.sh",
          "utf8"
        ),
      },
    ],
  });

  const device = new metal.Device(
    `${config.name}-control-plane-${number}`,
    {
      hostname: `${config.name}-control-plane-${number}`,
      metro: config.metro,
      billingCycle: metal.BillingCycle.Hourly,
      plan: config.plan,
      operatingSystem: metal.OperatingSystem.Ubuntu2004,
      projectId: config.project,
      customData: pulumi
        .all([
          controlPlane.joinToken,
          controlPlane.ipAddress,
          controlPlane.certificatePrivateKey,
          controlPlane.certificateCert,
        ])
        .apply(
          ([joinToken, ipAddress, certificatePrivateKey, certificateCert]) =>
            JSON.stringify({
              kubernetesVersion: config.kubernetesVersion,
              joinToken: joinToken,
              controlPlaneIp: ipAddress,
              certificatePrivateKey: certificatePrivateKey,
              certificateCert: certificateCert,
            })
        ),
      userData: cloudConfig.then((c) => c.rendered),
    },
    {
      dependsOn,
    }
  );

  new metal.BgpSession(`${config.name}-${number}`, {
    deviceId: device.id,
    addressFamily: "ipv4",
  });

  return device;
};
