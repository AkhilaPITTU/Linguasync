from fastapi import HTTPException, Header, status

from app.config.security import get_user_id

from app.schemas.meeting_schema import (
    CreateMeetingSchema,
    JoinMeetingSchema,
    LeaveMeetingSchema,
)

from app.services.meeting_service import (
    create_meeting,
    join_meeting,
    leave_meeting,
    end_meeting,
    get_meeting,
    get_participants,
    get_active_meeting,
)


# ==========================================
# CREATE MEETING
# ==========================================

async def create_meeting_controller(
    host_id: str,
    data: CreateMeetingSchema
):

    try:

        result = await create_meeting(
            host_id=host_id,
            meeting_type=data.meeting_type,
            preferred_language=data.preferred_language,
            output_mode=data.output_mode
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
# JOIN MEETING
# ==========================================

async def join_meeting_controller(
    user_id: str,
    data: JoinMeetingSchema
):

    try:

        result = await join_meeting(
            meeting_id=data.meeting_id,
            user_id=user_id,
            user_name=data.user_name,
            language=data.language
        )

        if not result["success"]:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
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
# LEAVE MEETING
# ==========================================

async def leave_meeting_controller(
    data: LeaveMeetingSchema
):

    try:

        result = await leave_meeting(
            meeting_id=data.meeting_id,
            user_id=data.user_id
        )

        if not result["success"]:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
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
# END MEETING
# ==========================================

async def end_meeting_controller(
    meeting_id: str,
    host_id: str
):

    try:

        result = await end_meeting(
            meeting_id=meeting_id,
            host_id=host_id
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
# GET MEETING
# ==========================================

async def get_meeting_controller(
    meeting_id: str
):

    try:

        result = await get_meeting(
            meeting_id
        )

        if not result["success"]:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
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
# GET PARTICIPANTS
# ==========================================

async def get_participants_controller(
    meeting_id: str
):

    try:

        result = await get_participants(
            meeting_id
        )

        if not result["success"]:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
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
# GET ACTIVE MEETING
# ==========================================

async def get_active_meeting_controller(
    authorization: str = Header(...)
):

    try:

        if not authorization.startswith("Bearer "):

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Authorization Header"
            )

        token = authorization.split(" ")[1]

        user_id = get_user_id(token)

        if not user_id:

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or Expired Token"
            )

        result = await get_active_meeting(user_id)

        if not result["success"]:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
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