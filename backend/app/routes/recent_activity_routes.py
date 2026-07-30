from fastapi import APIRouter
from app.controllers.recent_activity_controller import get_recent_activity

router = APIRouter(
    prefix="/dashboard",
    tags=["Recent Activity"]
)

router.get("/recent-activity")(get_recent_activity)