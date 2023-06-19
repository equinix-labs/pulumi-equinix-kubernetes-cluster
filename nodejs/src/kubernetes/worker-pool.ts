import { all, ComponentResource, Output } from "@pulumi/pulumi";
import * as cloudinit from "@pulumi/cloudinit";
import * as equinix from "@equinix-labs/pulumi-equinix";
import * as fs from "fs";

import { Cluster } from "./cluster";
import { PREFIX } from "./meta";

type WorkerNode = equinix.metal.Device;

export interface Config {
  nameSuffix: string;
  plan: equinix.metal.Plan;
  replicas: number;
}

export class WorkerPool extends ComponentResource {
  readonly workerNodes: WorkerNode[] = [];
  readonly name: string;

  constructor(cluster: Cluster, config: Config) {
    super(
      `${PREFIX}:kubernetes:WorkerPool`,
      `${cluster.name}-${config.nameSuffix}`,
      config,
      { parent: cluster }
    );

    this.name = `${cluster.name}-${config.nameSuffix}`

    for (let i = 1; i <= config.replicas; i++) {
      const workerNode = this.createWorkerPoolNode(config.nameSuffix, cluster, config, i);
      this.workerNodes.push(workerNode);
    }
  }

  private createWorkerPoolNode(
    name: string,
    cluster: Cluster,
    config: Config,
    num: number
  ): WorkerNode {
    const device = new equinix.metal.Device(
      `${cluster.name}-${name}-${num}`,
      {
        hostname: `${cluster.name}-${name}-${num}`,
        metro: cluster.config.metro,
        billingCycle: equinix.metal.BillingCycle.Hourly,
        plan: config.plan,
        operatingSystem: equinix.metal.OperatingSystem.Ubuntu2204,
        projectId: cluster.config.project,
        customData: all([cluster.joinToken, cluster.controlPlaneIp]).apply(
          ([joinToken, controlPlaneIp]) =>
            JSON.stringify({
              kubernetesVersion: cluster.config.kubernetesVersion,
              joinToken,
              controlPlaneIp,
            })
        ),
        userData: cloudConfig.then((c) => c.rendered),
      },
      {
        parent: this,
        dependsOn: cluster.controlPlane
          ? cluster.controlPlane.controlPlaneDevices.map((cp) => cp.device)
          : [],
      }
    );

    return device;
  }
}

const cloudConfig = cloudinit.getConfig({
  gzip: false,
  base64Encode: false,
  parts: [
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/pre-install.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/download-metadata.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/network-config-worker.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/containerd-prerequisites.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/kubernetes-prerequisites.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/kubernetes-kubeadm-packages.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/kubernetes-kubeadm-worker-config.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/kubernetes-kubeadm-worker-join.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/net-deny-metadata.sh",
        "utf8"
      ),
    },
    {
      contentType: "text/x-shellscript",
      content: fs.readFileSync(
        "../cloud-init/scripts/post-install.sh",
        "utf8"
      ),
    },
  ],
});
