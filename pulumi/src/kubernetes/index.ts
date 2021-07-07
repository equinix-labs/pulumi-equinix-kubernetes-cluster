import * as cloudinit from "@pulumi/cloudinit";
import * as metal from "@pulumi/equinix-metal";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import * as pki from "./pki";
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
  certificateAuthorityKey: pulumi.Output<string>;
  certificateAuthorityCert: pulumi.Output<string>;
  serviceAccountsPrivateKey: pulumi.Output<string>;
  serviceAccountsPublicKey: pulumi.Output<string>;
  serviceAccountsCert: pulumi.Output<string>;
  frontProxyPrivateKey: pulumi.Output<string>;
  frontProxyCert: pulumi.Output<string>;
  etcdPrivateKey: pulumi.Output<string>;
  etcdCert: pulumi.Output<string>;
}

interface ControlPlaneCertificates {
  serviceAccount: pki.KeyAndCert;
  frontProxy: pki.KeyAndCert;
  etcd: pki.KeyAndCert;
}

export const createControlPlane = (
  config: ControlPlaneConfig
): ControlPlane => {
  const certificateAuthority = pki.createCertificateAuthority(config.name);

  const certificates: ControlPlaneCertificates = {
    serviceAccount: pki.createKeyAndCert({
      name: "service-accounts",
      certificateAuthority,
      isCertificateAuthority: false,
    }),
    frontProxy: pki.createKeyAndCert({
      name: "front-proxy",
      certificateAuthority,
      isCertificateAuthority: true,
    }),
    etcd: pki.createKeyAndCert({
      name: "etcd",
      certificateAuthority,
      isCertificateAuthority: true,
    }),
  };

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
    certificateAuthorityKey: certificateAuthority.privateKey.privateKeyPem,
    certificateAuthorityCert: certificateAuthority.certificate.certPem,
    serviceAccountsPrivateKey:
      certificates.serviceAccount.privateKey.privateKeyPem,
    serviceAccountsPublicKey:
      certificates.serviceAccount.privateKey.publicKeyPem,
    serviceAccountsCert: certificates.serviceAccount.certificate.certPem,
    frontProxyPrivateKey: certificates.frontProxy.privateKey.privateKeyPem,
    frontProxyCert: certificates.frontProxy.certificate.certPem,
    etcdPrivateKey: certificates.etcd.privateKey.privateKeyPem,
    etcdCert: certificates.etcd.certificate.certPem,
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
          "../../cloud-init/scripts/kubernetes-kubeadm-config.sh",
          "utf8"
        ),
      },
      {
        contentType: "text/x-shellscript",
        content: fs.readFileSync(
          "../../cloud-init/scripts/kubernetes-kubeadm-certs.sh",
          "utf8"
        ),
      },
      {
        contentType: "text/x-shellscript",
        content: fs.readFileSync(
          "../../cloud-init/scripts/kubernetes-kubeadm-exec.sh",
          "utf8"
        ),
      },
      {
        contentType: "text/x-shellscript",
        content: fs.readFileSync("../../cloud-init/scripts/helm.sh", "utf8"),
      },
      {
        contentType: "text/x-shellscript",
        content: fs.readFileSync(
          "../../cloud-init/scripts/cni-cilium.sh",
          "utf8"
        ),
      },
      {
        contentType: "text/x-shellscript",
        content: fs.readFileSync(
          "../../cloud-init/scripts/ccm-disable.sh",
          "utf8"
        ),
      },
      {
        contentType: "text/x-shellscript",
        content: fs.readFileSync(
          "../../cloud-init/scripts/net-deny-metadata.sh",
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
          controlPlane.certificateAuthorityKey,
          controlPlane.certificateAuthorityCert,
          controlPlane.serviceAccountsPrivateKey,
          controlPlane.serviceAccountsPublicKey,
          controlPlane.serviceAccountsCert,
          controlPlane.frontProxyPrivateKey,
          controlPlane.frontProxyCert,
          controlPlane.etcdPrivateKey,
          controlPlane.etcdCert,
        ])
        .apply(
          ([
            joinToken,
            ipAddress,
            certificateAuthorityKey,
            certificateAuthorityCert,
            serviceAccountKey,
            serviceAccountPublicKey,
            serviceAccountCert,
            frontProxyKey,
            frontProxyCert,
            etcdKey,
            etcdCert,
          ]) =>
            JSON.stringify({
              kubernetesVersion: config.kubernetesVersion,
              joinToken: joinToken,
              controlPlaneIp: ipAddress,
              certificateAuthorityKey,
              certificateAuthorityCert,
              serviceAccountKey,
              serviceAccountPublicKey,
              serviceAccountCert,
              frontProxyKey,
              frontProxyCert,
              etcdKey,
              etcdCert,
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
