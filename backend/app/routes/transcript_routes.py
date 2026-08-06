from fastapi import APIRouter

from app.controllers.transcript_controller import (
    create_transcript_controller,
    get_meeting_transcripts_controller,
    verify_transcript_chain_controller,
)

from app.schemas.transcript_schema import CreateTranscriptSchema

router = APIRouter(
    prefix="/api/transcript",
    tags=["Transcript"]
)


# ==========================================
# CREATE TRANSCRIPT ENTRY
# ==========================================

@router.post("/create")
async def create_transcript(
    data: CreateTranscriptSchema
):

    return await create_transcript_controller(
        data=data
    )


# ==========================================
# GET TRANSCRIPTS FOR A MEETING
# ==========================================

@router.get("/meeting/{meeting_id}")
async def get_meeting_transcripts(
    meeting_id: str
):

    return await get_meeting_transcripts_controller(
        meeting_id=meeting_id
    )


# ==========================================
# VERIFY TRANSCRIPT HASH CHAIN
# ==========================================

@router.get("/meeting/{meeting_id}/verify")
async def verify_transcript_chain(
    meeting_id: str
):

    return await verify_transcript_chain_controller(
        meeting_id=meeting_id
    )