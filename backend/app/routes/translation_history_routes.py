from fastapi import APIRouter, Header

from app.controllers.translation_history_controller import (
    get_translation_history
)

router = APIRouter(
    prefix="/dashboard",
    tags=["Translation History"]
)


# ==========================================
# TRANSLATION HISTORY
# ==========================================

@router.get("/translation-history")
async def translation_history(

    authorization: str = Header(...)

):

    return await get_translation_history(

        authorization=authorization

    )