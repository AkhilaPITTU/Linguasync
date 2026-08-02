from fastapi import APIRouter, Header

from app.controllers.dashboard_controller import get_dashboard_statistics
from app.controllers.call_history_controller import get_recent_calls

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get("/statistics")
async def statistics(
    authorization: str = Header(...)
):
    return await get_dashboard_statistics(
        authorization=authorization
    )


@router.get("/recent-calls")
async def recent_calls(
    authorization: str = Header(...)
):
    return await get_recent_calls(
        authorization=authorization
    )