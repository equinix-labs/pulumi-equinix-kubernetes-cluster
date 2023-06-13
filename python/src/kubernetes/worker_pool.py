import helpers
import pulumi_cloudinit as cloudinit
import pulumi_equinix as equinix
from pulumi import ComponentResource, Output, ResourceOptions, input_type

from .meta import PREFIX


class WorkerNode:
    def __init__(self, device):
        self.device = device


@input_type
class Config:
    def __init__(self, name_suffix, plan, replicas):
        self.name_suffix = name_suffix
        self.plan = plan
        self.replicas = replicas


class WorkerPool(ComponentResource):
    def __init__(self, cluster, config: Config):
        super().__init__(
            f"{PREFIX}:kubernetes:WorkerPool",
            f"{cluster.name}-{config.name_suffix}",
            config.__dict__,
            ResourceOptions(parent=cluster),
        )

        self.cluster = cluster

        for i in range(1, config.replicas + 1):
            self.__create_worker_pool_node(config.name_suffix, cluster, config, i)

    def __create_worker_pool_node(self, name: str, cluster, config: Config, num: int):
        device = equinix.metal.Device(
            f"{cluster.name}-{name}-{num}",
            hostname=f"{cluster.name}-{name}-{num}",
            metro=cluster.config.metro,
            billing_cycle=equinix.metal.BillingCycle.HOURLY,
            plan=config.plan,
            operating_system=equinix.metal.OperatingSystem.UBUNTU2204,
            project_id=cluster.config.project,
            custom_data=Output.all(cluster.join_token, cluster.control_plane_ip).apply(
                lambda values: Output.json_dumps(
                    {
                        "kubernetesVersion": cluster.config.kubernetes_version,
                        "joinToken": values[0],
                        "controlPlaneIp": values[1],
                    },
                    separators=(",", ":"),
                )
            ),
            user_data=cloud_config.rendered,
            opts=ResourceOptions(
                parent=self,
                depends_on=list(
                    map(
                        lambda cp: cp.device,
                        cluster.control_plane.control_plane_devices,
                    )
                ),
            )
            if cluster.control_plane
            else None,
        )

        return WorkerNode(device)


cloud_config = cloudinit.get_config(
    gzip=False,
    base64_encode=False,
    parts=[
        cloudinit.ConfigPartArgs(
            content_type="text/x-shellscript",
            content=helpers.get_file_content(
                f"{helpers.get_project_root()}/cloud-init/scripts/pre-install.sh"
            ),
        ),
        cloudinit.ConfigPartArgs(
            content_type="text/x-shellscript",
            content=helpers.get_file_content(
                f"{helpers.get_project_root()}/cloud-init/scripts/download-metadata.sh"
            ),
        ),
        cloudinit.ConfigPartArgs(
            content_type="text/x-shellscript",
            content=helpers.get_file_content(
                f"{helpers.get_project_root()}/cloud-init/scripts/containerd-prerequisites.sh"
            ),
        ),
        cloudinit.ConfigPartArgs(
            content_type="text/x-shellscript",
            content=helpers.get_file_content(
                f"{helpers.get_project_root()}/cloud-init/scripts/kubernetes-prerequisites.sh"
            ),
        ),
        cloudinit.ConfigPartArgs(
            content_type="text/x-shellscript",
            content=helpers.get_file_content(
                f"{helpers.get_project_root()}/cloud-init/scripts/kubernetes-kubeadm-packages.sh"
            ),
        ),
        cloudinit.ConfigPartArgs(
            content_type="text/x-shellscript",
            content=helpers.get_file_content(
                f"{helpers.get_project_root()}/cloud-init/scripts/kubernetes-kubeadm-worker-config.sh"
            ),
        ),
        cloudinit.ConfigPartArgs(
            content_type="text/x-shellscript",
            content=helpers.get_file_content(
                f"{helpers.get_project_root()}/cloud-init/scripts/kubernetes-kubeadm-worker-join.sh"
            ),
        ),
        cloudinit.ConfigPartArgs(
            content_type="text/x-shellscript",
            content=helpers.get_file_content(
                f"{helpers.get_project_root()}/cloud-init/scripts/net-deny-metadata.sh"
            ),
        ),
        cloudinit.ConfigPartArgs(
            content_type="text/x-shellscript",
            content=helpers.get_file_content(
                f"{helpers.get_project_root()}/cloud-init/scripts/post-install.sh"
            ),
        ),
    ],
)
