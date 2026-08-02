import os
import uuid

from fastapi import APIRouter, UploadFile, File, Form

from app.controllers.realtime_translation_controller import (
    realtime_translation_controller
)

router = APIRouter(
    prefix="/api/realtime",
    tags=["Realtime Translation"]
)

UPLOAD_DIR = "uploads"

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)


@router.post("/translate")
async def realtime_translation(
    file: UploadFile = File(...),
    target_language: str = Form(...)
):

    extension = file.filename.split(".")[-1]

    filename = f"{uuid.uuid4()}.{extension}"

    file_path = os.path.join(
        UPLOAD_DIR,
        filename
    )

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    return await realtime_translation_controller(
        audio_path=file_path,
        target_language=target_language
    )