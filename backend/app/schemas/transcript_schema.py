from typing import Optional

from pydantic import BaseModel, Field


# ==========================================
# CREATE TRANSCRIPT SCHEMA
# ==========================================

class CreateTranscriptSchema(BaseModel):

    meeting_id: str

    speaker_id: str

    speaker_name: str

    source_language: str

    target_language: str

    original_text: str = Field(..., min_length=1)

    translated_text: str = Field(..., min_length=1)

    confidence: Optional[float] = None