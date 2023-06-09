import os
import sys

import pulumi
import pulumi_equinix as equinix

sys.path.insert(0, os.getcwd())
from kubernetes.cluster import Cluster
from kubernetes.cluster import Config as ClusterConfig
from kubernetes.controlplane.main import Config as ControlPlaneConfig
from kubernetes.worker_pool import Config as WorkerPoolConfig

stack_name = pulumi.get_stack()
config = pulumi.Config()

project = equinix.metal.Project(
    "example",
    name="pulumi-k8s",
    organization_id=config.require_secret("metalOrg"),
    bgp_config=equinix.metal.ProjectBgpConfigArgs(
        deployment_type="local",
        asn=65000,
    ),
)

cluster = Cluster(
    "example",
    ClusterConfig(
        kubernetes_version=config.get("kubernetesVersion") or "1.24.7",
        metro=config.get("metalMetro") or "SV",
        project=project.id,
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
