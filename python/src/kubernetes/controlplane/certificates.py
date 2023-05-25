import pulumi_tls as tls
from kubernetes.meta import PREFIX
from pulumi import ComponentResource, ResourceOptions


class CertificateAuthority(ComponentResource):
    def __init__(self, control_plane):
        super().__init__(
            f"{PREFIX}:kubernetes:CertificateAuthority",
            control_plane.cluster.name,
            opts=ResourceOptions(parent=control_plane),
        )

        self.private_key = tls.PrivateKey(
            control_plane.cluster.name,
            opts=ResourceOptions(parent=self),
            algorithm="RSA",
            rsa_bits=2048,
        )

        self.certificate = tls.SelfSignedCert(
            control_plane.cluster.name,
            validity_period_hours=87600,
            early_renewal_hours=168,
            is_ca_certificate=True,
            private_key_pem=self.private_key.private_key_pem,
            allowed_uses=[
                "cert_signing",
                "key_encipherment",
                "server_auth",
                "client_auth",
            ],
            subject={
                "common_name": control_plane.cluster.name,
            },
            opts=ResourceOptions(parent=self),
        )


class KeyAndCert(ComponentResource):
    def __init__(
        self,
        name: str,
        is_certificate_authority: bool,
        certificate_authority: CertificateAuthority,
    ):
        super().__init__(
            f"{PREFIX}:kubernetes:KeyAndCert",
            name,
            opts=ResourceOptions(parent=certificate_authority),
        )

        self.private_key = tls.PrivateKey(
            name,
            algorithm="RSA",
            rsa_bits=2048,
            opts=ResourceOptions(parent=self),
        )

        self.certificate_signing_request = tls.CertRequest(
            name,
            private_key_pem=self.private_key.private_key_pem,
            subject={
                "common_name": name,
            },
            opts=ResourceOptions(parent=self),
        )

        self.certificate = tls.LocallySignedCert(
            name,
            cert_request_pem=self.certificate_signing_request.cert_request_pem,
            ca_private_key_pem=certificate_authority.private_key.private_key_pem,
            ca_cert_pem=certificate_authority.certificate.cert_pem,
            is_ca_certificate=is_certificate_authority,
            validity_period_hours=87600,
            early_renewal_hours=168,
            allowed_uses=[
                "cert_signing",
                "key_encipherment",
                "server_auth",
                "client_auth",
            ],
            opts=ResourceOptions(parent=self),
        )
