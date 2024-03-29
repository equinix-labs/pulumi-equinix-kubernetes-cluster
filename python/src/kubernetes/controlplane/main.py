from typing import List

import pulumi_command as command
import pulumi_equinix as equinix
from kubernetes.meta import PREFIX
from pulumi import ComponentResource, Input, Output, ResourceOptions, input_type

from .certificates import CertificateAuthority, KeyAndCert
from .cloud_config import cloud_config
from .join_token import JoinToken


@input_type
class Config:
    def __init__(self, plan: equinix.metal.Plan, high_availability: bool):
        self.plan = plan
        self.high_availability = high_availability


@input_type
class ControlPlaneNode:
    def __init__(
        self, device: equinix.metal.Device, bgp_session: equinix.metal.BgpSession
    ):
        self.device = device
        self.bgp_session = bgp_session


class ControlPlane(ComponentResource):
    def __init__(self, cluster, config: Input["Config"], opts: ResourceOptions = None):
        super().__init__(
            f"{PREFIX}:kubernetes:ControlPlane",
            cluster.name,
            config.__dict__,
            opts=ResourceOptions(parent=cluster),
        )

        self.cluster = cluster
        self.config = config

        self.certificate_authority = CertificateAuthority(self)

        self.service_account_certificate = KeyAndCert(
            self.__create_name("service-accounts"), False, self.certificate_authority
        )

        self.front_proxy_certificate = KeyAndCert(
            self.__create_name("front-proxy"), True, self.certificate_authority
        )

        self.etcd_certificate = KeyAndCert(
            self.__create_name("etcd"), True, self.certificate_authority
        )

        self.join_token = JoinToken(self)

        self.ccm_api_key = equinix.metal.ProjectApiKey(
            f"{self.cluster.name}-api-key",
            project_id=self.cluster.config.project,
            description="API Key for Kubernetes CCM cloud-provider-equinix-metal",
            read_only=False,
            opts=ResourceOptions(parent=self),
        )

        self.control_plane_devices = []
        control_plane1 = self.__create_device(1)
        self.control_plane_devices.append(control_plane1)

        conn = command.remote.ConnectionArgs(
            host=control_plane1.device.access_public_ipv4,
            private_key=cluster.config.private_ssh_key,
            user="root",
        )

        wait_cloudinit = command.remote.Command(
            f"{self.cluster.name}-wait-cloud-init",
            connection=conn,
            create="cloud-init status --wait",
            opts=ResourceOptions(parent=self, depends_on=[control_plane1.device]),
        )

        self.kubeconfig = command.remote.Command(
            f"{self.cluster.name}-kubeconfig",
            connection=conn,
            create="cat /root/.kube/config",
            opts=ResourceOptions(
                parent=self,
                depends_on=[wait_cloudinit],
                additional_secret_outputs=["stdout"],
            ),
        ).stdout

        if config.high_availability:
            control_plane2 = self.__create_device(2, [control_plane1.device])
            self.control_plane_devices.append(control_plane2)

            control_plane3 = self.__create_device(3, [control_plane2.device])
            self.control_plane_devices.append(control_plane3)

    def __create_name(self, name: str) -> str:
        return f"{self.cluster.name}-{name}"

    def __create_device(
        self, i: int, depends_on: List[equinix.metal.Device] = []
    ) -> Output[ControlPlaneNode]:
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
                self.certificate_authority.private_key.private_key_pem,
                self.certificate_authority.certificate.cert_pem,
                self.service_account_certificate.private_key.private_key_pem,
                self.service_account_certificate.private_key.public_key_pem,
                self.front_proxy_certificate.private_key.private_key_pem,
                self.front_proxy_certificate.certificate.cert_pem,
                self.etcd_certificate.private_key.private_key_pem,
                self.etcd_certificate.certificate.cert_pem,
                self.cluster.config.project,
                self.ccm_api_key.token,
            ).apply(
                lambda values: Output.json_dumps(
                    {
                        "kubernetesVersion": self.cluster.config.kubernetes_version,
                        "controlPlaneRole": "primary" if i == 1 else "replica",
                        "joinToken": values[0],
                        "controlPlaneIp": values[1],
                        "certificateAuthorityKey": values[2],
                        "certificateAuthorityCert": values[3],
                        "serviceAccountKey": values[4],
                        "serviceAccountPublicKey": values[5],
                        "frontProxyKey": values[6],
                        "frontProxyCert": values[7],
                        "etcdKey": values[8],
                        "etcdCert": values[9],
                        "projectId": values[10],
                        "ccmApiKey": values[11] if i == 1 else "",
                    },
                    separators=(",", ":"),
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

        return Output.from_input(
            ControlPlaneNode(device=device, bgp_session=bgp_session)
        )
