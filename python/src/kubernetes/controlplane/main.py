from typing import List

import pulumi_equinix as equinix
from kubernetes.meta import PREFIX
from pulumi import ComponentResource, Output, ResourceOptions

from .certificates import CertificateAuthority, KeyAndCert
from .cloud_config import cloud_config
from .join_token import JoinToken


class Config:
    def __init__(self, plan: equinix.metal.Plan, high_availability: bool):
        self.plan = plan
        self.high_availability = high_availability


class ControlPlaneNode:
    def __init__(
        self, device: equinix.metal.Device, bgp_session: equinix.metal.BgpSession
    ):
        self.device = device
        self.bgp_session = bgp_session


class ControlPlane(ComponentResource):
    def __init__(self, cluster, config: Config, opts: ResourceOptions = None):
        super().__init__(
            f"{PREFIX}:kubernetes:ControlPlane",
            cluster.name,
            opts=ResourceOptions(parent=cluster),
        )

        self.cluster = cluster
        self.config = config

        self.certificate_authority = CertificateAuthority(self)

        self.service_account_certificate = KeyAndCert(
            self.create_name("service-accounts"), False, self.certificate_authority
        )

        self.front_proxy_certificate = KeyAndCert(
            self.create_name("front-proxy"), True, self.certificate_authority
        )

        self.etcd_certificate = KeyAndCert(
            self.create_name("etcd"), True, self.certificate_authority
        )

        self.join_token = JoinToken(self)

        self.control_plane_devices = []
        control_plane1 = self.create_device(1)
        self.control_plane_devices.append(control_plane1)

        if config.high_availability:
            control_plane2 = self.create_device(2, [control_plane1])
            self.control_plane_devices.append(control_plane2)

            control_plane3 = self.create_device(3, [control_plane2])
            self.control_plane_devices.append(control_plane3)

    def create_name(self, name: str) -> str:
        return f"{self.cluster.name}-{name}"

    def create_device(
        self, i: int, depends_on: List[equinix.metal.Device] = []
    ) -> ControlPlaneNode:
        hostname = f"{self.cluster.name}-control-plane-{i}"

        device = equinix.metal.Device(
            hostname,
            hostname=hostname,
            project_id=self.cluster.config.project,
            metro=self.cluster.config.metro,
            plan=self.config.plan,
            billing_cycle=equinix.metal.BillingCycle.HOURLY,
            operating_system=equinix.metal.OperatingSystem.UBUNTU2204,
            custom_data=Output.all(
                self.join_token.token,
                self.cluster.control_plane_ip,
                self.cluster.ingress_ip,
                self.certificate_authority.private_key.private_key_pem,
                self.certificate_authority.certificate.cert_pem,
                self.service_account_certificate.private_key.private_key_pem,
                self.service_account_certificate.private_key.public_key_pem,
                self.front_proxy_certificate.private_key.private_key_pem,
                self.front_proxy_certificate.certificate.cert_pem,
                self.etcd_certificate.private_key.private_key_pem,
                self.etcd_certificate.certificate.cert_pem,
            ).apply(
                lambda values: Output.json_dumps(
                    {
                        "kubernetesVersion": self.cluster.config.kubernetes_version,
                        "controlPlaneRole": "primary" if i == 1 else "replica",
                        "joinToken": values[0],
                        "controlPlaneIp": values[1],
                        "ingressIp": values[2],
                        "certificateAuthorityKey": values[3],
                        "certificateAuthorityCert": values[4],
                        "serviceAccountKey": values[5],
                        "serviceAccountPublicKey": values[6],
                        "frontProxyKey": values[7],
                        "frontProxyCert": values[8],
                        "etcdKey": values[9],
                        "etcdCert": values[10],
                    },
                    separators=(',', ':')
                )
            ),
            user_data=cloud_config.rendered,
            opts=ResourceOptions(parent=self),
        )

        bgp_session = equinix.metal.BgpSession(
            hostname,
            device_id=device.id,
            address_family="ipv4",
            opts=ResourceOptions(parent=self, depends_on=[device]),
        )

        return ControlPlaneNode(device=device, bgp_session=bgp_session)
