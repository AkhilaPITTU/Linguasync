from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ==========================================
# REGISTER
# ==========================================

class RegisterSchema(BaseModel):

    full_name: str = Field(
        ...,
        min_length=3,
        max_length=100
    )

    email: EmailStr

    password: str = Field(
        ...,
        min_length=8,
        max_length=100
    )


# ==========================================
# LOGIN
# ==========================================

class LoginSchema(BaseModel):

    email: EmailStr

    password: str = Field(
        ...,
        min_length=8
    )


# ==========================================
# USER RESPONSE
# ==========================================

class UserResponseSchema(BaseModel):

    id: Optional[str] = None

    full_name: str

    email: EmailStr

    role: str

    profile_image: Optional[str] = None

    is_verified: bool

    is_active: bool


# ==========================================
# LOGIN RESPONSE
# ==========================================

class TokenResponseSchema(BaseModel):

    access_token: str

    token_type: str = "bearer"


# ==========================================
# FORGOT PASSWORD
# ==========================================

class ForgotPasswordSchema(BaseModel):

    email: EmailStr


# ==========================================
# RESET PASSWORD
# ==========================================

class ResetPasswordSchema(BaseModel):

    token: str

    password: str = Field(
        ...,
        min_length=8,
        max_length=100
    )


# ==========================================
# CHANGE PASSWORD
# ==========================================

class ChangePasswordSchema(BaseModel):

    old_password: str

    new_password: str = Field(
        ...,
        min_length=8,
        max_length=100
    )