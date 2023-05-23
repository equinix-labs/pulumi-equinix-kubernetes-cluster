import pulumi_tls as tls


class CertificateAuthority:
    def __init__(self, private_key, certificate):
        self.private_key = private_key
        self.certificate = certificate


class KeyAndCert:
    def __init__(self, private_key, certificate):
        self.private_key = private_key
        self.certificate = certificate


allowed_uses = [
    "signing",
    "key encipherment",
    "server auth",
    "client auth",
]


def create_certificate_authority(name):
    private_key = tls.PrivateKey(name, algorithm="RSA", rsa_bits=2048)

    certificate = tls.SelfSignedCert(
        name,
        validity_period_hours=87600,
        early_renewal_hours=168,
        is_ca_certificate=True,
        private_key_pem=private_key.private_key_pem,
        allowed_uses=allowed_uses,
        subject={"common_name": name},
    )

    return CertificateAuthority(private_key, certificate)


def create_key_and_cert(name, certificate_authority, is_certificate_authority):
    private_key = tls.PrivateKey(name, algorithm="RSA", rsa_bits=2048)

    certificate_request = tls.CertRequest(
        name,
        private_key_pem=private_key.private_key_pem,
        subject={"common_name": name},
    )

    certificate = tls.LocallySignedCert(
        name,
        cert_request_pem=certificate_request.cert_request_pem,
        ca_private_key_pem=certificate_authority.private_key.private_key_pem,
        ca_cert_pem=certificate_authority.certificate.cert_pem,
        is_ca_certificate=is_certificate_authority,
        validity_period_hours=87600,
        early_renewal_hours=168,
        allowed_uses=allowed_uses,
    )

    return KeyAndCert(private_key, certificate)
