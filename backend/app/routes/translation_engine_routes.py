from fastapi import APIRouter
from app.controllers.translation_engine_controller import get_translation_engine

router = APIRouter(
    prefix="/dashboard",
    tags=["Translation Engine"]
)

router.get("/translation-engine")(get_translation_engine)