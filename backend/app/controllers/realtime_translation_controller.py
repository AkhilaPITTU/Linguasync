from app.services.realtime_translation_service import (
    realtime_translation_service
)


async def realtime_translation_controller(
    audio_path: str,
    target_language: str
):

    return await realtime_translation_service.realtime_translate(
        audio_path=audio_path,
        target_language=target_language
    )