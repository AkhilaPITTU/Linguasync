from fastapi import APIRouter

from app.schemas.text_to_speech_schema import (
    TextToSpeechSchema
)

from app.controllers.text_to_speech_controller import (
    text_to_speech_controller
)

router = APIRouter(
    prefix="/api/tts",
    tags=["Text To Speech"]
)


@router.post("/generate")
async def generate_audio(
    data: TextToSpeechSchema
):

    return await text_to_speech_controller(
        data.text,
        data.language
    )