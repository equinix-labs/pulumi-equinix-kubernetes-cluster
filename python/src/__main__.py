import os
import sys

import pulumi
import pulumi_equinix as equinix
import pulumi_tls as tls
from pulumi import Input, Output

sys.path.insert(0, os.getcwd())
from kubernetes.cluster import Cluster
from kubernetes.cluster import Config as ClusterConfig
from kubernetes.controlplane.main import Config as ControlPlaneConfig
from kubernetes.worker_pool import Config as WorkerPoolConfig


def create_project() -> equinix.metal.Project:
    return equinix.metal.Project(
        "example",
        name="pulumi-k8s",
        organization_id=config.get("organization"),
        bgp_config=equinix.metal.ProjectBgpConfigArgs(
            deployment_type="local",
            asn=65000,
        ),
    )


def create_project_key(
    private_key_output_path: str, project_id: Input[str]
) -> Output[str]:
    private_key = tls.PrivateKey(
        "example",
        algorithm="ED25519",
    )

    equinix.metal.ProjectSshKey(
        "example",
        project_id=project_id,
        name="pulumi-k8s",
        public_key=private_key.public_key_openssh,
    )

    # Write private key to a sensitive local file
    private_key_output = private_key.private_key_openssh
    private_key_output.apply(
        lambda key: Output.secret(key).apply(
            lambda key: (
                open(private_key_output_path, "w").write(key),
                os.chmod(private_key_output_path, 0o600),
            )
        )
    )
    return private_key_output


# Get configuration values
config = pulumi.Config()
kubernetes_version = config.get("kubernetesVersion", "1.24.7")
metal_metro = config.get("metro", "SV")
project_id = config.get("project", create_project().id)
ssh_private_key_path = config.get("sshPrivateKeyPath")
private_ssh_key = (
    create_project_key("pulumi-k8s-metal-ssh-key", project_id)
    if ssh_private_key_path is None
    else Output.secret((lambda path: open(path).read())(ssh_private_key_path))
)

# Create new Cluster
cluster = Cluster(
    "example",
    ClusterConfig(
        kubernetes_version=kubernetes_version,
        metro=metal_metro,
        project=project_id,
        private_ssh_key=private_ssh_key,
        control_plane_config=ControlPlaneConfig(
            high_availability=False,
            plan=equinix.metal.Plan.C3_SMALL_X86,
        ),
        worker_pool_configs=[
            WorkerPoolConfig(
                name_suffix="worker",
                plan=equinix.metal.Plan.C3_SMALL_X86,
                replicas=2,
            )
        ],
    ),
)

pulumi.export("kubeconfig", cluster.control_plane.kubeconfig)

cp_nodes = {
    node.device.hostname: node.device.access_public_ipv4
    for node in cluster.control_plane.control_plane_devices
}
pulumi.export("controlPlaneDeviceIps", Output.all(cp_nodes))


worker_pools = {}
for name, pool in cluster.worker_pools.items():
    worker_pools[name] = {
        node.device.hostname: node.device.access_public_ipv4
        for node in pool.worker_nodes
    }

pulumi.export("WorkerPoolsDeviceIps", Output.all(worker_pools))
