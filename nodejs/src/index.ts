import * as pulumi from "@pulumi/pulumi";
import * as equinix from "@equinix-labs/pulumi-equinix";
import { Cluster } from "./kubernetes";

const stackName = pulumi.getStack();
const config = new pulumi.Config();

const project = new equinix.metal.Project("example", {
  name: "pulumi-k8s",
  organizationId: config.requireSecret("metalOrg"),
  bgpConfig: {
    deploymentType: "local",
    asn: 65000,
  },
});

const cluster = new Cluster("example", {
  kubernetesVersion: config.get("kubernetesVersion") || "1.24.7",
  metro: config.get("metalMetro") || "SV",
  project: project.id,
});

cluster.createControlPlane({
  highAvailability: false,
  plan: equinix.metal.Plan.C3SmallX86,
});

cluster.createWorkerPool("worker", {
  plan: equinix.metal.Plan.C3SmallX86,
  replicas: 2,
});
