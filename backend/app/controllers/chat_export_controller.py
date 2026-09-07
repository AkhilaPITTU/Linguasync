import json

from fastapi import Header, HTTPException, status
from fastapi.responses import Response

from app.config.security import get_user_id
from app.services.chat_export_service import (
    ChatExportError,
    chat_content_disposition,
    chat_export_filename,
    export_chat_json,
)


async def export_chat_controller(meeting_id: str, authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization Header",
        )

    requester_id = get_user_id(authorization.split(" ", 1)[1])
    if not requester_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or Expired Token",
        )

    try:
        payload = await export_chat_json(meeting_id, requester_id)
    except ChatExportError as error:
        print(
            f"[chat-export] failed meeting_id={meeting_id} requester_id={requester_id} "
            f"status={error.status_code}"
        )
        raise HTTPException(status_code=error.status_code, detail=error.message) from error

    filename = chat_export_filename(meeting_id)
    return Response(
        content=json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8"),
        media_type="application/json",
        headers={"Content-Disposition": chat_content_disposition(filename)},
    )
