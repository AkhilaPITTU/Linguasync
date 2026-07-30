from fastapi import APIRouter

from app.controllers.profile_controller import get_profile

router = APIRouter(

    prefix="/profile",

    tags=["Profile"]

)

router.get("/")(get_profile)