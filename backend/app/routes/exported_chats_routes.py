from fastapi import APIRouter, Header

from app.controllers.exported_chats_controller import (
    get_exported_chats
)

router = APIRouter(
    prefix="/dashboard",
    tags=["Chat History"]
)


# ==========================================
# GET SAVED CHAT HISTORY
# ==========================================

@router.get("/chat-history")
async def chat_history(

    authorization: str = Header(...)

):

    return await get_exported_chats(

        authorization=authorization

    )
