from datetime import datetime, timezone
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


# ==========================================
# PARTICIPANT MODEL
# ==========================================

class Participant(BaseModel):

    user_id: str

    user_name: str

    language: str

    preferred_language: str = "English"

    source_language: str = "English"

    output_mode: str = "none"

    mic_enabled: bool = True

    camera_enabled: bool = True

    screen_share: bool = False

    speaking: bool = False


# ==========================================
# MEETING MODEL
# ==========================================

class Meeting(BaseModel):

    meeting_id: str

    host_id: str

    participants: List[Participant] = Field(default_factory=list)

    meeting_type: Literal["video", "audio"]

    status: Literal["active", "completed", "cancelled"]

    # Translation Information
    source_language: str = "Detecting..."

    preferred_language: str

    output_mode: Literal[
        "original",
        "text",
        "speech",
        "text_speech",
        "translated_speech"
    ]

    translation_status: Literal["Running", "Stopped"] = "Running"

    # Device Status
    microphone_status: Literal["ON", "OFF"] = "ON"

    camera_status: Literal["ON", "OFF"] = "ON"

    started_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    ended_at: Optional[datetime] = None
