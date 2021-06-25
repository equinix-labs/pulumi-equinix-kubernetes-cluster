import * as pulumi from "@pulumi/pulumi";
import * as metal from "@pulumi/equinix-metal";
import { ControlPlaneConfig, createControlPlane } from "./kubernetes";

const stack = pulumi.runtime.getStack();
const projectConfig = new pulumi.Config();

const controlPlane = createControlPlane({
  name: stack,
  highlyAvailable: false,
  plan: metal.Plan.C1SmallX86,

  // These come from a config to allow them to be configured differently in different
  // Pulumi stacks, where as the values above are unlikely to change across stacks.
  kubernetesVersion: projectConfig.require("kubernetesVersion"),
  project: projectConfig.require("projectId"),
  metro: projectConfig.require("metro"),
});
