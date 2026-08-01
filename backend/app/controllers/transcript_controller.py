from fastapi import HTTPException, status

from app.schemas.transcript_schema import CreateTranscriptSchema

from app.services.transcript_service import (
    create_transcript_entry,
    get_transcripts_by_meeting,
    verify_transcript_chain,
)


# ==========================================
# CREATE TRANSCRIPT ENTRY
# ==========================================

async def create_transcript_controller(
    data: CreateTranscriptSchema
):

    try:

        result = await create_transcript_entry(
            meeting_id=data.meeting_id,
            speaker_id=data.speaker_id,
            speaker_name=data.speaker_name,
            source_language=data.source_language,
            target_language=data.target_language,
            original_text=data.original_text,
            translated_text=data.translated_text,
            confidence=data.confidence
        )

        if not result["success"]:

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )

        return result

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ==========================================
# GET TRANSCRIPTS FOR A MEETING
# ==========================================

async def get_meeting_transcripts_controller(
    meeting_id: str
):

    try:

        result = await get_transcripts_by_meeting(
            meeting_id=meeting_id
        )

        return result

    except Exception as e:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ==========================================
# VERIFY TRANSCRIPT HASH CHAIN
# ==========================================

async def verify_transcript_chain_controller(
    meeting_id: str
):

    try:

        result = await verify_transcript_chain(
            meeting_id=meeting_id
        )

        return result

    except Exception as e:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )