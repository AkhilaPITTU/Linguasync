from fastapi import APIRouter
from app.controllers.exported_chats_controller import get_exported_chats

router = APIRouter(
    prefix="/dashboard",
    tags=["Exported Chats"]
)

router.get("/exported-chats")(get_exported_chats)