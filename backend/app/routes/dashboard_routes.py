from fastapi import APIRouter

from app.controllers.dashboard_controller import get_dashboard_statistics

router = APIRouter(

    prefix="/dashboard",

    tags=["Dashboard"]

)

router.get("/statistics")(get_dashboard_statistics)