from fastapi import APIRouter, Header
from pydantic import BaseModel, Field

from app.controllers.profile_controller import get_profile, update_profile


class UpdateProfileSchema(BaseModel):
    full_name: str = Field(min_length=1, max_length=100)
    preferred_language: str = Field(min_length=1, max_length=100)
    output_mode: str | None = None

router = APIRouter(

    prefix="/profile",

    tags=["Profile"]

)

router.get("/")(get_profile)


@router.put("/")
async def update_current_profile(
    data: UpdateProfileSchema,
    authorization: str = Header(...),
):
    return await update_profile(data, authorization)
