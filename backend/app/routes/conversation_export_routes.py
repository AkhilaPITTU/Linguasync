from typing import Optional

from fastapi import APIRouter, File, Header, Query, UploadFile
from fastapi.responses import Response

from app.config.signing_config import get_public_certificate_pem
from app.controllers.conversation_export_controller import (
    export_conversation_pdf_controller,
    verify_conversation_pdf_controller,
)

router = APIRouter(
    prefix="/api/conversation",
    tags=["Conversation Export"],
)


# ==========================================
# DOWNLOAD MY CONVERSATION AS A SIGNED PDF
# ==========================================

@router.get("/{meeting_id}/export-pdf")
async def export_conversation_pdf_route(
    meeting_id: str,
    language: Optional[str] = Query(
        default=None,
        description="Language to export in. Defaults to the caller's own preferred language for this meeting.",
    ),
    authorization: str = Header(...),
):
    return await export_conversation_pdf_controller(
        meeting_id=meeting_id,
        language=language,
        authorization=authorization,
    )


# ==========================================
# VERIFY AN UPLOADED PDF'S SIGNATURE
# ==========================================

@router.post("/verify-pdf")
async def verify_conversation_pdf_route(
    file: UploadFile = File(...),
    authorization: str = Header(...),
):
    return await verify_conversation_pdf_controller(
        file=file,
        authorization=authorization,
    )


# ==========================================
# PUBLISH THE SIGNING CERTIFICATE (PUBLIC KEY ONLY)
# ==========================================

@router.get("/signing-certificate")
async def signing_certificate_route():
    pem_bytes = get_public_certificate_pem()
    return Response(
        content=pem_bytes,
        media_type="application/x-pem-file",
        headers={
            "Content-Disposition": 'attachment; filename="linguasync_signing_certificate.pem"'
        },
    )
