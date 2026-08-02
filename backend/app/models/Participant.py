from datetime import datetime, timezone

from pydantic import BaseModel, Field


class Participant(BaseModel):

    meeting_id: str

    user_id: str

    user_name: str

    joined_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    mic_enabled: bool = True

    camera_enabled: bool = True

    screen_share: bool = False

    speaking: bool = False

    language: str = "English"
    