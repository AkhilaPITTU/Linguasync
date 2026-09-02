from datetime import datetime
from typing import List, Optional, Literal

from pydantic import BaseModel


# ==========================================
# CREATE MEETING
# ==========================================

class CreateMeetingSchema(BaseModel):

    meeting_type: Literal["video", "audio"]

    preferred_language: str

    output_mode: Literal[
        "original",
        "text",
        "speech",
        "text_speech",
        "translated_speech"
    ]


# ==========================================
# JOIN MEETING
# ==========================================

class JoinMeetingSchema(BaseModel):

    meeting_id: str

    user_name: str

    preferred_language: str

    # Spoken/source language is deliberately independent from the recipient
    # subtitle language. Older clients may omit it and retain the existing
    # preferred-language fallback.
    source_language: str | None = None

    # Translated voice/TTS has been removed entirely: only "none" and
    # "subtitle" (text-only) are valid recipient output modes.
    output_mode: Literal["none", "subtitle"]


# ==========================================
# LEAVE MEETING
# ==========================================

class LeaveMeetingSchema(BaseModel):

    meeting_id: str

    user_id: str


# ==========================================
# PARTICIPANT
# ==========================================

class ParticipantSchema(BaseModel):

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
# MEETING RESPONSE
# ==========================================

class MeetingResponseSchema(BaseModel):

    meeting_id: str

    host_id: str

    participants: List[ParticipantSchema]

    meeting_type: Literal["video", "audio"]

    status: Literal["active", "completed", "cancelled"]

    source_language: str

    preferred_language: str

    output_mode: str

    translation_status: str

    microphone_status: str

    camera_status: str

    started_at: datetime

    ended_at: Optional[datetime] = None
