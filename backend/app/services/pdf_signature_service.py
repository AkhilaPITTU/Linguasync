"""Cryptographic PDF digital signature service.

This module is the only place in the codebase that knows how to sign or
verify a PDF. It applies a real PAdES-style PKCS#7/CMS signature (via
pyHanko) using the server's private key from ``app.config.signing_config``
-- not a watermark, not a checksum. The signature is embedded in the PDF
itself as an incremental update, covering every byte written before the
signature. Any edit made to the document afterwards changes those bytes,
so re-hashing them during verification no longer matches what was signed
and the signature is reported as broken ("not intact").
"""

import io
import logging

from asn1crypto import x509 as asn1_x509
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko.sign import signers
from pyhanko.sign.fields import SigFieldSpec, append_signature_field
from pyhanko.sign.validation import validate_pdf_signature
from pyhanko_certvalidator import ValidationContext

from app.config.signing_config import get_signer, get_trust_anchor_der

logger = logging.getLogger("linguasync.pdf_signature")

SIGNATURE_FIELD_NAME = "LinguaSyncSignature"
SIGNATURE_ALGORITHM = "RSA-2048 / SHA-256 (PAdES, PKCS#7 / CMS)"


def sign_pdf_bytes(pdf_bytes: bytes, *, reason: str, location: str = "LinguaSync Server") -> bytes:
    """Return ``pdf_bytes`` with an embedded cryptographic signature appended."""

    signer = get_signer()

    source = io.BytesIO(pdf_bytes)
    writer = IncrementalPdfFileWriter(source)

    append_signature_field(writer, SigFieldSpec(sig_field_name=SIGNATURE_FIELD_NAME))

    signature_meta = signers.PdfSignatureMetadata(
        field_name=SIGNATURE_FIELD_NAME,
        reason=reason,
        location=location,
    )

    signed_stream = signers.sign_pdf(writer, signature_meta, signer=signer)
    return signed_stream.getvalue()


def _extract_document_id(pdf_bytes: bytes):
    """Best-effort read of the Document ID we stamp into the PDF's
    ``/Subject`` metadata field at generation time (see
    ``conversation_pdf_service.build_conversation_pdf``). Used only to
    correlate a verified file back to its export-log entry; verification
    itself never depends on this succeeding.
    """

    try:
        reader = PdfFileReader(io.BytesIO(pdf_bytes))
        info_ref = reader.trailer["/Info"]
        info = info_ref.get_object()
        subject = info.get("/Subject")
        if subject and str(subject).strip() and str(subject) != "unspecified":
            return str(subject)
    except Exception:  # noqa: BLE001 - metadata extraction is best-effort
        logger.debug("Could not read /Subject metadata from uploaded PDF.", exc_info=True)
    return None


def verify_pdf_bytes(pdf_bytes: bytes) -> dict:
    """Cryptographically verify an (allegedly) LinguaSync-signed PDF.

    Returns a plain dict (no pyhanko types) so callers/controllers can
    serialize it directly as JSON.
    """

    document_id = _extract_document_id(pdf_bytes)

    try:
        reader = PdfFileReader(io.BytesIO(pdf_bytes))
    except Exception as exc:  # noqa: BLE001
        return {
            "signed": False,
            "signature_valid": False,
            "document_modified": None,
            "document_id": document_id,
            "error": f"This does not look like a valid PDF file ({exc}).",
        }

    signatures = reader.embedded_signatures
    if not signatures:
        return {
            "signed": False,
            "signature_valid": False,
            "document_modified": None,
            "document_id": document_id,
            "error": "No LinguaSync digital signature was found in this PDF.",
        }

    trust_root = asn1_x509.Certificate.load(get_trust_anchor_der())
    validation_context = ValidationContext(trust_roots=[trust_root], allow_fetching=False)

    # A LinguaSync export carries exactly one signature field; if more than
    # one is present (e.g. a second signer added it after export) we still
    # validate the one this service produced.
    signature = next(
        (sig for sig in signatures if sig.field_name == SIGNATURE_FIELD_NAME),
        signatures[0],
    )

    try:
        status = validate_pdf_signature(signature, signer_validation_context=validation_context)
    except Exception as exc:  # noqa: BLE001
        logger.warning("PDF signature validation raised an exception: %s", exc)
        return {
            "signed": True,
            "signature_valid": False,
            "document_modified": True,
            "document_id": document_id,
            "error": f"Signature could not be validated ({exc}).",
        }

    signer_common_name = None
    try:
        signer_common_name = status.signing_cert.subject.native.get("common_name")
    except Exception:  # noqa: BLE001
        pass

    intact = bool(status.intact)
    signature_valid = bool(status.intact and status.valid and status.bottom_line)

    return {
        "signed": True,
        "signature_valid": signature_valid,
        "document_modified": not intact,
        "document_id": document_id,
        "signer_common_name": signer_common_name,
        "signing_time": status.signer_reported_dt.isoformat() if status.signer_reported_dt else None,
        "coverage": str(status.coverage) if status.coverage is not None else None,
        "error": None if signature_valid else (
            "The document was modified after it was signed."
            if not intact
            else "The signature could not be trusted as an authentic LinguaSync signature."
        ),
    }
