from pydantic import BaseModel
from typing import List


class SendInvitationSchema(BaseModel):
    meeting_id: str
    participants: List[str]


class RespondInvitationSchema(BaseModel):
    invitation_id: str