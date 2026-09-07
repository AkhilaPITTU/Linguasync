from fastapi import APIRouter, Header

from app.controllers.conversation_export_controller import export_conversation_pdf_controller

router = APIRouter(prefix="/api/meeting", tags=["Meeting Export"])


@router.post("/{meeting_id}/conversation-export")
async def export_conversation_pdf(meeting_id: str, authorization: str = Header(...)):
    return await export_conversation_pdf_controller(meeting_id, authorization)
