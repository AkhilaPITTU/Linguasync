from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field


# ==========================================
# TRANSCRIPT MODEL
# ==========================================

class Transcript(BaseModel):

    meeting_id: str

    speaker_id: str

    speaker_name: str

    # Translation Information
    source_language: str

    target_language: str

    original_text: str

    translated_text: str

    confidence: Optional[float] = None

    # ==========================
    # Hash Chain (Tamper-Evidence)
    # ==========================
    # Each record's hash is calculated from its own content
    # plus the previous record's hash, forming a chain.
    # This lets us detect if any past record was edited.

    prev_hash: str = "0" * 64

    hash: Optional[str] = None

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )