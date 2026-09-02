from fastapi import Header, HTTPException, status
from fastapi.responses import Response

from app.config.security import get_user_id
from app.services.conversation_export_service import ConversationExportError, content_disposition, export_conversation_pdf


async def export_conversation_pdf_controller(meeting_id: str, authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Authorization Header")
    requester_id = get_user_id(authorization.split(" ", 1)[1])
    if not requester_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or Expired Token")
    print(f"[conversation-export] request meeting_id={meeting_id} user_id={requester_id}")
    try:
        pdf_bytes, filename = await export_conversation_pdf(meeting_id, requester_id)
    except ConversationExportError as error:
        print(
            f"[conversation-export] failed meeting_id={meeting_id} "
            f"stage=export error={type(error).__name__}"
        )
        raise HTTPException(status_code=error.status_code, detail=error.message) from error
    except Exception as error:
        print(
            f"[conversation-export] failed meeting_id={meeting_id} "
            f"stage=unexpected error={type(error).__name__}"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to generate the conversation PDF.") from error
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": content_disposition(filename)})
