"""Self-managed X.509 signing identity for the conversation PDF export
feature.

LinguaSync signs every exported conversation PDF with a private key held
only on the server. On first use this module generates a 2048-bit RSA
key pair and a self-signed certificate, and stores both on disk so every
export/verify call in the process (and every future run) uses the same
identity. Nothing here touches any other part of the application.

The certificate is self-signed rather than issued by a public CA: this
service verifies "was this PDF produced and untouched by this LinguaSync
server", not "is this a publicly trusted CA-issued document", so a
self-signed root that the server itself trusts is the correct model. The
public certificate can be handed out (see ``get_public_certificate_pem``)
so a third party can independently confirm the signer identity.
"""

import datetime
import os
import threading

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

from pyhanko.sign import signers

_LOCK = threading.RLock()
_signer_cache = None
_trust_anchor_der_cache = None

_CERT_DIR = os.getenv("PDF_SIGNING_CERT_DIR", os.path.join("certs", "pdf_signing"))
_KEY_PATH = os.path.join(_CERT_DIR, "linguasync_signing_key.pem")
_CERT_PATH = os.path.join(_CERT_DIR, "linguasync_signing_cert.pem")

_CERT_COMMON_NAME = os.getenv(
    "PDF_SIGNING_CERT_CN", "LinguaSync Conversation PDF Signing"
)
_CERT_VALID_DAYS = int(os.getenv("PDF_SIGNING_CERT_VALID_DAYS", "3650"))


def _generate_signing_material() -> None:
    os.makedirs(_CERT_DIR, exist_ok=True)

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    subject = issuer = x509.Name(
        [
            x509.NameAttribute(NameOID.COUNTRY_NAME, "IN"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "LinguaSync"),
            x509.NameAttribute(NameOID.COMMON_NAME, _CERT_COMMON_NAME),
        ]
    )

    now = datetime.datetime.utcnow()

    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(days=1))
        .not_valid_after(now + datetime.timedelta(days=_CERT_VALID_DAYS))
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                content_commitment=True,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                key_cert_sign=False,
                crl_sign=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .sign(key, hashes.SHA256())
    )

    with open(_KEY_PATH, "wb") as key_file:
        key_file.write(
            key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption(),
            )
        )

    with open(_CERT_PATH, "wb") as cert_file:
        cert_file.write(cert.public_bytes(serialization.Encoding.PEM))

    try:
        os.chmod(_KEY_PATH, 0o600)
    except OSError:
        # Best effort only; some filesystems (notably Windows/NTFS via a
        # plain os.chmod) do not support POSIX permission bits.
        pass


def _ensure_signing_material() -> None:
    if os.path.exists(_KEY_PATH) and os.path.exists(_CERT_PATH):
        return

    with _LOCK:
        if not (os.path.exists(_KEY_PATH) and os.path.exists(_CERT_PATH)):
            _generate_signing_material()


def get_signer():
    """Return a cached ``pyhanko`` signer backed by the server's private key."""

    global _signer_cache

    if _signer_cache is None:
        with _LOCK:
            if _signer_cache is None:
                _ensure_signing_material()
                _signer_cache = signers.SimpleSigner.load(
                    key_file=_KEY_PATH,
                    cert_file=_CERT_PATH,
                    key_passphrase=None,
                )

    return _signer_cache


def get_trust_anchor_der() -> bytes:
    """Return the DER-encoded signing certificate used as the sole trust
    anchor when verifying a previously exported PDF."""

    global _trust_anchor_der_cache

    if _trust_anchor_der_cache is None:
        _ensure_signing_material()
        with open(_CERT_PATH, "rb") as cert_file:
            pem = cert_file.read()
        cert = x509.load_pem_x509_certificate(pem)
        _trust_anchor_der_cache = cert.public_bytes(serialization.Encoding.DER)

    return _trust_anchor_der_cache


def get_public_certificate_pem() -> bytes:
    """Return the PEM-encoded public certificate (never the private key)."""

    _ensure_signing_material()
    with open(_CERT_PATH, "rb") as cert_file:
        return cert_file.read()
