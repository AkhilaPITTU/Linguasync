from fastapi import APIRouter, Header

from app.controllers.recent_activity_controller import get_recent_activity

router = APIRouter(
    prefix="/dashboard",
    tags=["Recent Activity"]
)


@router.get("/recent-activity")
async def recent_activity(

    authorization: str = Header(...)

):

    return await get_recent_activity(

        authorization=authorization

    )