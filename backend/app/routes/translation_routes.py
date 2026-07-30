from fastapi import APIRouter

from app.schemas.translation_schema import TranslationSchema
from app.controllers.translation_controller import translate_controller

router = APIRouter(
    prefix="/api/translation",
    tags=["Translation"]
)


@router.post("/translate")
async def translate(
    data: TranslationSchema
):
    return await translate_controller(
        data.text,
        data.source_language,
        data.target_language
    )