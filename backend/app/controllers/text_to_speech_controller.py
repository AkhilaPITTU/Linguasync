from app.services.text_to_speech_service import (
    text_to_speech_service
)


async def text_to_speech_controller(
    text: str,
    language: str
):

    return await text_to_speech_service.text_to_speech(
        text=text,
        language=language
    )