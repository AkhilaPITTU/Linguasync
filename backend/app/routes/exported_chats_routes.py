from fastapi import APIRouter, Header

from app.controllers.exported_chats_controller import (
    get_exported_chats
)

router = APIRouter(
    prefix="/dashboard",
    tags=["Exported Chats"]
)


# ==========================================
# GET EXPORTED CHATS
# ==========================================

@router.get("/exported-chats")
async def exported_chats(

    authorization: str = Header(...)

):

    return await get_exported_chats(

        authorization=authorization

    )