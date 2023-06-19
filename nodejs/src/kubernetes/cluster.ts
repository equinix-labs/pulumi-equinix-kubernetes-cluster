import { ComponentResource, Input, Output } from "@pulumi/pulumi";
import * as equinix from "@equinix-labs/pulumi-equinix";

import { PREFIX } from "./meta";
import { WorkerPool, Config as WorkerPoolConfig } from "./worker-pool";
import { ControlPlane, Config as ControlPlaneConfig } from "./control-plane";


interface Config {
  project: Input<string>;
  metro: string;
  kubernetesVersion: string;
  privateSshKey: Input<string>;
  controlPlaneConfig: ControlPlaneConfig;
  workerPoolConfigs?: WorkerPoolConfig[];
}


export class Cluster extends ComponentResource {
  readonly name: string;
  readonly config: Config;
  readonly controlPlaneIp: Output<string>;
  readonly controlPlane: ControlPlane;
  readonly joinToken: Output<string>;
  readonly workerPools: {[name: string]: WorkerPool} = {};

  constructor(name: string, config: Config) {
    super(`${PREFIX}:kubernetes:Cluster`, name, config, {});

      this.name = name;
      this.config = config;
  
      this.controlPlaneIp = new equinix.metal.ReservedIpBlock(
          `${name}-control-plane`,
          {
              projectId: config.project,
              metro: config.metro,
              type: equinix.metal.IpBlockType.PublicIPv4,
              quantity: 1,
          },
          { parent: this }
      ).address;
      this.controlPlane = new ControlPlane(this, config.controlPlaneConfig);
      this.joinToken = this.controlPlane.joinToken.token.apply((t) => t);

      if (config.workerPoolConfigs) {
        config.workerPoolConfigs.forEach((workerConfig) => {
          this.createWorkerPool(workerConfig);
        });
      }

      this.registerOutputs({
        kubeconfig: this.controlPlane.kubeconfig,
        controlPlaneDevices: this.controlPlane.controlPlaneDevices,
        workerPools: this.workerPools,
      });
  }

  private createWorkerPool(config: WorkerPoolConfig) {
    const wp = new WorkerPool(this, config);
    this.workerPools[wp.name] = wp;
  }
}

