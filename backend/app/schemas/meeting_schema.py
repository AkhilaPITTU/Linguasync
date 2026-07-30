from datetime import datetime
from typing import List, Optional, Literal

from pydantic import BaseModel


# ==========================================
# CREATE MEETING
# ==========================================

class CreateMeetingSchema(BaseModel):

    meeting_type: Literal["video", "audio"]

    target_language: str


# ==========================================
# JOIN MEETING
# ==========================================

class JoinMeetingSchema(BaseModel):

    meeting_id: str

    user_name: str

    language: str


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

    target_language: str

    translation_status: str

    microphone_status: str

    camera_status: str

    started_at: datetime

    ended_at: Optional[datetime] = None