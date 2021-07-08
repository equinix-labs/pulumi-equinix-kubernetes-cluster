import * as pulumi from "@pulumi/pulumi";
import * as metal from "@pulumi/equinix-metal";
import { Cluster } from "./kubernetes";

const cluster = new Cluster("rawkode", {
  kubernetesVersion: "1.21.2",
  metro: "am",
  project: "7158c8a9-a55e-454e-a1aa-ce5f8937ed10",
});

cluster.createControlPlane({
  highAvailability: false,
  plan: metal.Plan.C1SmallX86,
});

cluster.createWorkerPool("primary", {
  kubernetesVersion: "1.21.2",
  plan: metal.Plan.C1SmallX86,
  replicas: 2,
});
