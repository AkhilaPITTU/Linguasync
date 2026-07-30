from fastapi import APIRouter
from app.controllers.translation_history_controller import get_translation_history

router = APIRouter(
    prefix="/dashboard",
    tags=["Translation History"]
)

router.get("/translation-history")(get_translation_history)