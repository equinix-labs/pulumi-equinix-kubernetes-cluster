import { ComponentResource, Output } from "@pulumi/pulumi";

import * as pulumi from "@pulumi/pulumi";
import * as equinix from "@equinix-labs/pulumi-equinix";
import { remote, types } from "@pulumi/command";

import { PREFIX } from "../meta";
import { Cluster } from "../cluster";
import { CertificateAuthority, KeyAndCert } from "./certificates";
import { JoinToken } from "./join-token";
import { cloudConfig } from "./cloud-config";

export interface Config {
  plan: equinix.metal.Plan;
  highAvailability: boolean;
}

interface ControlPlaneNode {
  device: equinix.metal.Device;
  bgpSession: equinix.metal.BgpSession;
}

export class ControlPlane extends ComponentResource {
  readonly cluster: Cluster;
  readonly config: Config;
  readonly certificateAuthority: CertificateAuthority;
  readonly serviceAccountCertificate: KeyAndCert;
  readonly frontProxyCertificate: KeyAndCert;
  readonly etcdCertificate: KeyAndCert;
  readonly joinToken: JoinToken;
  readonly controlPlaneDevices: ControlPlaneNode[] = [];
  readonly kubeconfig: Output<string>;
  private ccmApiKey: equinix.metal.ProjectApiKey;

  constructor(cluster: Cluster, config: Config) {
    super(`${PREFIX}:kubernetes:ControlPlane`, cluster.name, config, {
      parent: cluster,
    });

    this.cluster = cluster;
    this.config = config;

    this.certificateAuthority = new CertificateAuthority(this);

    this.serviceAccountCertificate = new KeyAndCert(
      this.createName("service-accounts"),
      false,
      this.certificateAuthority
    );

    this.frontProxyCertificate = new KeyAndCert(
      this.createName("front-proxy"),
      true,
      this.certificateAuthority
    );

    this.etcdCertificate = new KeyAndCert(
      this.createName("etcd"),
      true,
      this.certificateAuthority
    );

    this.joinToken = new JoinToken(this);

    this.ccmApiKey = new equinix.metal.ProjectApiKey(
      `${cluster.name}-api-key`,
      {
        projectId: cluster.config.project,
        description: "API Key for Kubernetes CCM cloud-provider-equinix-metal",
        readOnly: false,
      },
      {
        parent: this,
      }
    );

    const controlPlane1 = this.createDevice(1);
    this.controlPlaneDevices.push(controlPlane1);

    const conn: types.input.remote.ConnectionArgs = {
      host: controlPlane1.device.accessPublicIpv4,
      privateKey: cluster.config.privateSshKey,
      user: "root",
    };

    const waitCloudInit = new remote.Command(
      `${cluster.name}-wait-cloud-init`,
      {
          connection: conn,
          create: "cloud-init status --wait",
      },
      {
          parent: this,
          dependsOn: [controlPlane1.device],
      }
    );

    this.kubeconfig = new remote.Command(
      `${cluster.name}-kubeconfig`,
      {
          connection: conn,
          create: "cat /root/.kube/config",
      },
      {
          parent: this,
          dependsOn: [waitCloudInit],
          additionalSecretOutputs: ["stdout"],
      }
    ).stdout;

    if (config.highAvailability) {
      const controlPlane2 = this.createDevice(2, [controlPlane1.device]);
      this.controlPlaneDevices.push(controlPlane2);

      const controlPlane3 = this.createDevice(3, [controlPlane2.device]);
      this.controlPlaneDevices.push(controlPlane3);
    }
  }

  private createName(name: string) {
    return `${this.cluster.name}-${name}`;
  }

  private createDevice(i: number, dependsOn: equinix.metal.Device[] = []): ControlPlaneNode {
    const hostname = `${this.cluster.name}-control-plane-${i}`;

    const device = new equinix.metal.Device(
      hostname,
      {
        hostname,
        projectId: this.cluster.config.project,
        metro: this.cluster.config.metro,
        plan: this.config.plan,

        // Not configurable, yet.
        billingCycle: equinix.metal.BillingCycle.Hourly,
        operatingSystem: equinix.metal.OperatingSystem.Ubuntu2204,
        customData: pulumi
          .all([
            this.joinToken.token,
            this.cluster.controlPlaneIp,
            this.certificateAuthority.privateKey.privateKeyPem,
            this.certificateAuthority.certificate.certPem,
            this.serviceAccountCertificate.privateKey.privateKeyPem,
            this.serviceAccountCertificate.privateKey.publicKeyPem,
            this.frontProxyCertificate.privateKey.privateKeyPem,
            this.frontProxyCertificate.certificate.certPem,
            this.etcdCertificate.privateKey.privateKeyPem,
            this.etcdCertificate.certificate.certPem,
            this.cluster.config.project,
            this.ccmApiKey.token,
          ])
          .apply(
            ([
              joinToken,
              controlPlaneIp,
              certificateAuthorityKey,
              certificateAuthorityCert,
              serviceAccountKey,
              serviceAccountPublicKey,
              frontProxyKey,
              frontProxyCert,
              etcdKey,
              etcdCert,
              projectId,
              ccmApiKey
            ]) =>
              JSON.stringify({
                kubernetesVersion: this.cluster.config.kubernetesVersion,
                controlPlaneRole: i == 1 ? "primary" : "replica",
                joinToken,
                controlPlaneIp,
                certificateAuthorityKey,
                certificateAuthorityCert,
                serviceAccountKey,
                serviceAccountPublicKey,
                frontProxyKey,
                frontProxyCert,
                etcdKey,
                etcdCert,
                projectId,
                ccmApiKey: i == 1 ? ccmApiKey : "",
              })
          ),
        userData: cloudConfig.then((c) => c.rendered),
      },
      {
        parent: this,
        dependsOn,
      }
    );

    const bgpSession = new equinix.metal.BgpSession(
      hostname,
      {
        deviceId: device.id,
        addressFamily: "ipv4",
      },
      {
        parent: this,
        dependsOn: [device],
      }
    );

    return {
      device,
      bgpSession,
    };
  }
}
