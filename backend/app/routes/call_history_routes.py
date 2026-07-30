from fastapi import APIRouter
from app.controllers.call_history_controller import get_recent_calls

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

router.get("/recent-calls")(get_recent_calls)