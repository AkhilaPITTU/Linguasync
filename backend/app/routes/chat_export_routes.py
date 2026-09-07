from fastapi import APIRouter, Header

from app.controllers.chat_export_controller import export_chat_controller


router = APIRouter(prefix="/api/meeting", tags=["Meeting Chat Export"])


@router.post("/{meeting_id}/chat-export")
async def export_chat(meeting_id: str, authorization: str = Header(...)):
    return await export_chat_controller(meeting_id, authorization)
