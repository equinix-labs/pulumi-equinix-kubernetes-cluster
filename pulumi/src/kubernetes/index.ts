import * as pulumi from "@pulumi/pulumi";
import * as cloudinit from "@pulumi/cloudinit";
import * as metal from "@pulumi/equinix-metal";
import * as random from "@pulumi/random";
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
  certificateKey: pulumi.Output<string>;
}

const cloudConfig = new cloudinit.Config("control-plane", {
  gzip: false,
  base64Encode: true,
  parts: [
    {
      contentType: "cloud-config",
      content: fs.readFileSync(
        "../../cloud-init/configs/metadata.yaml",
        "utf8"
      ),
    },
    {
      contentType: "cloud-config",
      content: fs.readFileSync(
        "../../cloud-init/configs/kubernetes.yaml",
        "utf8"
      ),
    },
    {
      contentType: "x-shellscript",
      content: fs.readFileSync(
        "../../cloud-init/scripts/add-bgp-routes.sh",
        "utf8"
      ),
    },
    {
      contentType: "x-shellscript",
      content: fs.readFileSync("../../cloud-init/scripts/kube-vip.sh", "utf8"),
    },
    {
      contentType: "x-shellscript",
      content: fs.readFileSync(
        "../../cloud-init/scripts/join-cluster.sh",
        "utf8"
      ),
    },
  ],
});

export const createControlPlane = (
  config: ControlPlaneConfig
): ControlPlane => {
  const certificateKey = new random.RandomString("certificateKey", {
    length: 32,
    special: false,
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
    projectId: "7158c8a9-a55e-454e-a1aa-ce5f8937ed10",
    metro: "am",
    type: "public_ipv4",
    quantity: 1,
  });

  const controlPlane = {
    ipAddress: ip.address,
    joinToken: pulumi.interpolate`${joinTokenLeft.result}.${joinTokenRight.result}`,
    certificateKey: certificateKey.result,
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
          controlPlane.certificateKey,
          controlPlane.joinToken,
          controlPlane.ipAddress,
        ])
        .apply(([certificateKey, joinToken, ipAddress]) =>
          JSON.stringify({
            kubernetesVersion: config.kubernetesVersion,
            joinToken: joinToken,
            controlPlaneIp: ipAddress,
            certificateKey: certificateKey,
          })
        ),
      userData: cloudConfig.rendered.apply(
        (cloudConfig) => `#cloud-config\n\n${cloudConfig}`
      ),
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
