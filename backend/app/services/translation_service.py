import asyncio

from app.ai.translation_service import translation_service


async def translate_text(text, source_language, target_language):
    """Preserve the existing REST translation response format."""
    source_code = translation_service.get_language_code(source_language)
    target_code = translation_service.get_language_code(target_language)
    result = await asyncio.to_thread(
        translation_service.translate,
        text,
        source_lang=source_code,
        target_lang=target_code,
    )

    if not result.get("success"):
        return {
            "success": False,
            "message": result.get("message") or result.get("reason"),
        }

    return {
        "success": True,
        "original_text": text,
        "translated_text": result.get("translated_text") or text,
        "source_language": source_code,
        "target_language": target_code,
    }
