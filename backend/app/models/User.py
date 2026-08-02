from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class User(BaseModel):

    # ==========================
    # Basic Information
    # ==========================

    full_name: str = Field(..., min_length=3, max_length=100)

    email: EmailStr

    password: str

    profile_image: Optional[str] = None

    role: str = "user"

    # ==========================
    # Account Status
    # ==========================

    is_active: bool = True

    is_verified: bool = False

    login_method: str = "email"

    # ==========================
    # Tokens
    # ==========================

    verification_token: Optional[str] = None

    reset_token: Optional[str] = None

    # ==========================
    # Audit Information
    # ==========================

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    last_login: Optional[datetime] = None