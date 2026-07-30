from app.services.translation_service import (
    translate_text
)


async def translate_controller(
    text: str,
    source_language: str,
    target_language: str
):

    return await translate_text(
        text,
        source_language,
        target_language
    )