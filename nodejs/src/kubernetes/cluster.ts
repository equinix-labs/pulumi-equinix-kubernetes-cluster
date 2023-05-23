import { ComponentResource, Output } from "@pulumi/pulumi";
import * as equinix from "@equinix-labs/pulumi-equinix";

import { PREFIX } from "./meta";
import { WorkerPool, Config as WorkerPoolConfig } from "./worker-pool";
import { ControlPlane, Config as ControlPlaneConfig } from "./control-plane";

interface Config {
  project: Output<string>;
  metro: string;
  kubernetesVersion: string;
}

export class Cluster extends ComponentResource {
  readonly name: string;
  readonly config: Config;
  readonly controlPlaneIp: Output<string>;
  public controlPlane?: ControlPlane;
  private workerPools: { [name: string]: WorkerPool } = {};

  constructor(name: string, config: Config) {
    super(`${PREFIX}:kubernetes:Cluster`, name, config, {});

    this.name = name;
    this.config = config;

    this.controlPlaneIp = new equinix.metal.ReservedIpBlock(
      `${name}-control-plane`,
      {
        projectId: config.project,
        metro: config.metro,
        type: "public_ipv4",
        quantity: 1,
      },
      {
        parent: this,
      }
    ).address;
  }

  public createControlPlane(config: ControlPlaneConfig) {
    if (this.controlPlane) {
      throw new Error(
        `Control plane for cluster ${this.name} already specified`
      );
    }

    this.controlPlane = new ControlPlane(this, {
      highAvailability: config.highAvailability,
      plan: config.plan,
    });
  }

  public joinToken(): Output<string> | undefined {
    return this.controlPlane?.joinToken.token.apply((t) => t);
  }

  public createWorkerPool(name: string, config: WorkerPoolConfig) {
    this.workerPools[name] = new WorkerPool(this, name, config);
  }
}
