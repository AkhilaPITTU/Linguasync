from pydantic import BaseModel
from typing import List, Literal


class SendInvitationSchema(BaseModel):
    meeting_id: str
    participants: List[str]


class RespondInvitationSchema(BaseModel):
    invitation_id: str


class AcceptInvitationSchema(BaseModel):
    preferred_language: str
    output_mode: Literal["none", "subtitle", "voice", "subtitle_voice"]
