import * as pulumi from "@pulumi/pulumi";
import * as metal from "@pulumi/equinix-metal";
import * as random from "@pulumi/random";
import { Cluster } from "./kubernetes";

const stackName = pulumi.getStack();
const config = new pulumi.Config();

const project = new metal.Project("example", {
  name: "example",
  organizationId: config.requireSecret("metalOrg"),
  bgpConfig: {
    deploymentType: "local",
    asn: 65000,
  },
});

const cluster = new Cluster("example", {
  kubernetesVersion: config.require("kubernetesVersion"),
  metro: config.require("metalMetro"),
  project: project.id,
});

cluster.createControlPlane({
  highAvailability: false,
  plan: metal.Plan.C1SmallX86,
});

cluster.createWorkerPool("worker", {
  kubernetesVersion: "1.22.0",
  plan: metal.Plan.C1SmallX86,
  replicas: 2,
});
