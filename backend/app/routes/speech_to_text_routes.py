import os
import uuid

from fastapi import APIRouter, UploadFile, File

from app.controllers.speech_to_text_controller import (
    speech_to_text_controller
)

router = APIRouter(
    prefix="/api/speech",
    tags=["Speech To Text"]
)

UPLOAD_DIR = "uploads"

os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...)
):

    extension = file.filename.split(".")[-1]

    filename = f"{uuid.uuid4()}.{extension}"

    file_path = os.path.join(
        UPLOAD_DIR,
        filename
    )

    with open(file_path, "wb") as f:
        f.write(await file.read())

    return await speech_to_text_controller(
        file_path
    )