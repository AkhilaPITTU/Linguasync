from app.services.speech_to_text_service import speech_to_text_service


async def speech_to_text_controller(
    audio_path: str
):

    return await speech_to_text_service.speech_to_text(
        audio_path
    )