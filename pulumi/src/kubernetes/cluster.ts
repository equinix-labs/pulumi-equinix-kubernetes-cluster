import { all, ComponentResource, Output } from "@pulumi/pulumi";
import * as pulumi from "@pulumi/pulumi";
import * as cloudinit from "@pulumi/cloudinit";
import * as metal from "@pulumi/equinix-metal";
import * as random from "@pulumi/random";
import * as tls from "@pulumi/tls";
import * as fs from "fs";

import { PREFIX } from "./meta";
import { WorkerPool, Config as WorkerPoolConfig } from "./worker-pool";
import { ControlPlane, Config as ControlPlaneConfig } from "./control-plane";

interface Config {
  project: string;
  metro: string;
  kubernetesVersion: string;
}

export class Cluster extends ComponentResource {
  readonly name: string;
  readonly config: Config;
  public controlPlane?: ControlPlane;
  private workerPools: { [name: string]: WorkerPool } = {};

  constructor(name: string, config: Config) {
    super(`${PREFIX}:kubernetes:Cluster`, name, config, {});

    this.name = name;
    this.config = config;
  }

  public createControlPlane(config: ControlPlaneConfig) {
    this.controlPlane = new ControlPlane(this, {
      highAvailability: config.highAvailability,
      plan: config.plan,
    });
  }

  public joinToken(): Output<string> | undefined {
    return this.controlPlane?.joinToken.token.apply((t) => t);
  }

  public controlPlaneIp(): Output<string> | undefined {
    return this.controlPlane?.elasticIp.address.apply((a) => a);
  }

  public createWorkerPool(name: string, config: WorkerPoolConfig) {
    this.workerPools[name] = new WorkerPool(name, this, config);
  }
}

const workerCloudConfig = cloudinit.getConfig({
  gzip: false,
  base64Encode: false,
  parts: [
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
        "../../cloud-init/scripts/kubernetes-kubeadm-worker-join.sh",
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
