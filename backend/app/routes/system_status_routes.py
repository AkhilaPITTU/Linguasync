from fastapi import APIRouter
from app.controllers.system_status_controller import get_system_status

router = APIRouter(
    prefix="/dashboard",
    tags=["System Status"]
)

router.get("/system-status")(get_system_status)