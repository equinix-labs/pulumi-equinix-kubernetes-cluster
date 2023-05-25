import os
import sys
from typing import Dict

import pulumi_equinix as equinix

sys.path.insert(0, os.getcwd())

from kubernetes.controlplane.main import Config as ControlPlaneConfig
from kubernetes.controlplane.main import ControlPlane
from kubernetes.meta import PREFIX
from pulumi import ComponentResource, Output, ResourceOptions

from .worker_pool import Config as WorkerPoolConfig
from .worker_pool import WorkerPool


class Config:
    def __init__(self, project: Output[str], metro: str, kubernetes_version: str):
        self.project = project
        self.metro = metro
        self.kubernetes_version = kubernetes_version


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

        self.ingress_ip = equinix.metal.ReservedIpBlock(
            f"{name}-ingress",
            project_id=config.project,
            metro=config.metro,
            type=equinix.metal.IpBlockType.PUBLIC_I_PV4,
            quantity=1,
            opts=ResourceOptions(parent=self),
        ).address

        self.control_plane = None
        self.worker_pools: Dict[str, WorkerPool] = {}

    def create_control_plane(self, config: ControlPlaneConfig):
        if self.control_plane:
            raise ValueError(f"Control plane for cluster {self.name} already specified")

        self.control_plane = ControlPlane(self, config)

    def join_token(self):
        return (
            self.control_plane.join_token.token.apply(lambda t: t)
            if self.control_plane
            else None
        )

    def create_worker_pool(self, name: str, config: WorkerPoolConfig):
        self.worker_pools[name] = WorkerPool(self, name, config)
