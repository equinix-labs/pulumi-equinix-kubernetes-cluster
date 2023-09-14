import * as pulumi from "@pulumi/pulumi";
import * as equinix from "@equinix-labs/pulumi-equinix";
import * as tls from "@pulumi/tls";
import * as fs from 'fs';

import { Cluster } from "./kubernetes";


function createProject() {
  return new equinix.metal.Project("example", {
      name: "pulumi-k8s",
      organizationId: config.get("organization"),
      bgpConfig: {
          deploymentType: "local",
          asn: 65000,
      },
  });
}

function createProjectKey(privateKeyOutputPath: string, projectId: pulumi.Input<string>) {
  const privateKey = new tls.PrivateKey("example", {
      algorithm: "ED25519",
  });

  new equinix.metal.ProjectSshKey("example", {
      projectId: projectId,
      name: "pulumi-k8s",
      publicKey: privateKey.publicKeyOpenssh,
  });

  // Write private key to a sensitive local file
  const privateKeyOutput = privateKey.privateKeyOpenssh;
  privateKeyOutput.apply(privateKey => {
    pulumi.output(privateKey).apply(key => {
        fs.writeFileSync(privateKeyOutputPath, key);
        fs.chmodSync(privateKeyOutputPath, 0o600);
    });
  });

  return privateKeyOutput;
}

// Get configuration values
const config = new pulumi.Config();
const kubernetesVersion = config.get("kubernetesVersion") || "1.24.7";
const metalMetro = config.get("metro") || "SV";
const projectId = config.get("project") || createProject().id;
const sshPrivateKeyPath = config.get("sshPrivateKeyPath");
const privateSshKey = sshPrivateKeyPath
    ? pulumi.secret(fs.readFileSync(sshPrivateKeyPath, "utf8"))
    : createProjectKey("pulumi-k8s-metal-ssh-key", projectId);

const cluster = new Cluster("example", {
  kubernetesVersion: kubernetesVersion,
  metro: metalMetro,
  project: projectId,
  privateSshKey: privateSshKey,
  controlPlaneConfig: {
    highAvailability: false,
    plan: equinix.metal.Plan.C3SmallX86,
  },
  workerPoolConfigs: [
    {
        nameSuffix: "worker",
        plan: equinix.metal.Plan.C3SmallX86,
        replicas: 2,
    },
  ],
});

// export kubeconfig
export const kubeconfig = cluster.controlPlane.kubeconfig;

// export controlPlaneDeviceIps
const cpNodes: pulumi.Output<{ hostname: string; ip: string }[]> = pulumi.all(
  cluster.controlPlane.controlPlaneDevices.map((node) => ({
    hostname: node.device.hostname,
    ip: node.device.accessPublicIpv4,
  }))
);
export const controlPlaneDeviceIps = cpNodes;


// export workerPoolsDeviceIps
const workerPools: { [key: string]: pulumi.Output<{ hostname: string; ip: string }[]> } = {};
Object.keys(cluster.workerPools).forEach((name) => {
  let pool = cluster.workerPools[name];
  const wNodes: pulumi.Output<{ hostname: string; ip: string }[]> = pulumi.all(
    pool.workerNodes.map((node) => ({
      hostname: node.hostname,
      ip: node.accessPublicIpv4,
    }))
  );
  workerPools[name] = wNodes;
});

export const workerPoolsDeviceIps = workerPools;
