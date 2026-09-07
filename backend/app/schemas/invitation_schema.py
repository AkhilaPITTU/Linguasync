from pydantic import BaseModel
from typing import List, Literal


class SendInvitationSchema(BaseModel):
    meeting_id: str
    participants: List[str]


class RespondInvitationSchema(BaseModel):
    invitation_id: str


class AcceptInvitationSchema(BaseModel):
    preferred_language: str
    # Translated voice/TTS has been removed entirely: only "none" and
    # "subtitle" (text-only) are valid recipient output modes.
    output_mode: Literal["none", "subtitle"]
