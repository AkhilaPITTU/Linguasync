import logging

from fastapi import HTTPException, UploadFile, status
from fastapi.responses import Response

from app.config.security import get_user_id
from app.services.conversation_export_service import (
    export_conversation_pdf,
    verify_conversation_pdf,
)

logger = logging.getLogger("linguasync.conversation_export")

# Guards the verify-upload endpoint against unreasonably large uploads;
# a genuine LinguaSync export is at most a few hundred KB.
MAX_VERIFY_FILE_SIZE_BYTES = 20 * 1024 * 1024


def _authenticate(authorization: str) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization Header",
        )

    user_id = get_user_id(authorization.split(" ", 1)[1])

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or Expired Token",
        )

    return user_id


# ==========================================
# EXPORT CONVERSATION PDF
# ==========================================

async def export_conversation_pdf_controller(
    meeting_id: str,
    language: str | None,
    authorization: str,
):
    user_id = _authenticate(authorization)

    try:
        result = await export_conversation_pdf(
            meeting_id=meeting_id,
            user_id=user_id,
            language=language,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(
            "Unexpected error exporting conversation PDF -> meeting_id=%s user_id=%s",
            meeting_id, user_id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate the conversation PDF.",
        ) from exc

    if not result.get("success"):
        raise HTTPException(
            status_code=result.get("status", status.HTTP_400_BAD_REQUEST),
            detail=result.get("message", "Unable to export the conversation."),
        )

    headers = {
        "Content-Disposition": f'attachment; filename="{result["filename"]}"',
        "X-Document-Id": result["document_id"],
        "Access-Control-Expose-Headers": "Content-Disposition, X-Document-Id",
    }

    return Response(
        content=result["pdf_bytes"],
        media_type="application/pdf",
        headers=headers,
    )


# ==========================================
# VERIFY CONVERSATION PDF
# ==========================================

async def verify_conversation_pdf_controller(
    file: UploadFile,
    authorization: str,
):
    user_id = _authenticate(authorization)

    filename = file.filename or "upload.pdf"
    looks_like_pdf = (
        (file.content_type or "").lower() in ("application/pdf", "application/octet-stream")
        or filename.lower().endswith(".pdf")
    )
    if not looks_like_pdf:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a PDF file.",
        )

    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    if len(file_bytes) > MAX_VERIFY_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is too large to verify.",
        )

    try:
        result = await verify_conversation_pdf(file_bytes=file_bytes, verified_by=user_id)
    except Exception as exc:
        logger.exception(
            "Unexpected error verifying uploaded PDF -> user_id=%s filename=%s",
            user_id, filename,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to verify the uploaded PDF.",
        ) from exc

    return result
