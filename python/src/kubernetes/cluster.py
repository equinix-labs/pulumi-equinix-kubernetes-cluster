import os
import sys
from typing import Any, Dict

import pulumi_equinix as equinix

sys.path.insert(0, os.getcwd())

from typing import Optional

import pulumi
from kubernetes.controlplane.main import Config as ControlPlaneConfig
from kubernetes.controlplane.main import ControlPlane
from kubernetes.meta import PREFIX
from pulumi import ComponentResource, Output, ResourceOptions

from .worker_pool import Config as WorkerPoolConfig
from .worker_pool import WorkerPool


@pulumi.input_type
class Config:
    def __init__(
        self,
        project: pulumi.Output[str],
        metro: str,
        kubernetes_version: str,
        private_ssh_key: pulumi.Output[str],
        control_plane_config: pulumi.Input["ControlPlaneConfig"],
        worker_pool_configs: Optional[list[pulumi.Input["WorkerPoolConfig"]]] = [],
    ):
        self.project = project
        self.metro = metro
        self.kubernetes_version = kubernetes_version
        self.private_ssh_key = private_ssh_key
        self.control_plane_config = control_plane_config
        self.worker_pool_configs = worker_pool_configs


class Cluster(ComponentResource):
    def __init__(self, name: str, config: Config):
        super().__init__(f"{PREFIX}:kubernetes:Cluster", name, config.__dict__)

        self.name = name
        self.config = config
        self.control_plane_ip = equinix.metal.ReservedIpBlock(
            f"{name}-control-plane",
            project_id=config.project,
            metro=config.metro,
            type=equinix.metal.IpBlockType.PUBLIC_I_PV4,
            quantity=1,
            opts=ResourceOptions(parent=self),
        ).address
        self.control_plane = ControlPlane(self, config.control_plane_config)
        self.join_token = self.control_plane.join_token.token.apply(lambda t: t)

        self.worker_pools: Dict[str, WorkerPool] = {}
        for worker_config in config.worker_pool_configs:
            self.__create_worker_pool(worker_config.name_suffix, worker_config)

        self.register_outputs({"kubeconfig": self.control_plane.kubeconfig})

    def __create_worker_pool(self, name: str, config: WorkerPoolConfig):
        self.worker_pools[name] = WorkerPool(self, config)
