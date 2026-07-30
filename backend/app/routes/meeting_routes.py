from fastapi import APIRouter

from app.controllers.meeting_controller import (
    create_meeting_controller,
    join_meeting_controller,
    leave_meeting_controller,
    end_meeting_controller,
    get_meeting_controller,
    get_participants_controller,
    get_active_meeting_controller,
)

from app.schemas.meeting_schema import (
    CreateMeetingSchema,
    JoinMeetingSchema,
    LeaveMeetingSchema,
)

router = APIRouter(
    prefix="/api/meeting",
    tags=["Meeting"]
)


# ==========================================
# CREATE MEETING
# ==========================================

@router.post("/create")
async def create_meeting(
    host_id: str,
    data: CreateMeetingSchema
):

    return await create_meeting_controller(
        host_id=host_id,
        data=data
    )


# ==========================================
# JOIN MEETING
# ==========================================

@router.post("/join")
async def join_meeting(
    user_id: str,
    data: JoinMeetingSchema
):

    return await join_meeting_controller(
        user_id=user_id,
        data=data
    )


# ==========================================
# LEAVE MEETING
# ==========================================

@router.post("/leave")
async def leave_meeting(
    data: LeaveMeetingSchema
):

    return await leave_meeting_controller(
        data=data
    )


# ==========================================
# END MEETING
# ==========================================

@router.put("/end/{meeting_id}")
async def end_meeting(
    meeting_id: str,
    host_id: str
):

    return await end_meeting_controller(
        meeting_id=meeting_id,
        host_id=host_id
    )


# ==========================================
# GET ACTIVE MEETING
# IMPORTANT:
# Keep this route ABOVE "/{meeting_id}"
# ==========================================

@router.get("/active")
async def get_active_meeting():

    return await get_active_meeting_controller()


# ==========================================
# GET MEETING DETAILS
# ==========================================

@router.get("/{meeting_id}")
async def get_meeting(
    meeting_id: str
):

    return await get_meeting_controller(
        meeting_id=meeting_id
    )


# ==========================================
# GET PARTICIPANTS
# ==========================================

@router.get("/{meeting_id}/participants")
async def get_participants(
    meeting_id: str
):

    return await get_participants_controller(
        meeting_id=meeting_id
    )