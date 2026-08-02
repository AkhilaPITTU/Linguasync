from fastapi import APIRouter, status

from app.controllers.auth_controller import (
    register_controller,
    login_controller,
    forgot_password_controller,
    reset_password_controller,
)

from app.schemas.user_schema import (
    RegisterSchema,
    LoginSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema,
)

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)


# ==========================================
# REGISTER
# ==========================================

@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED
)
async def register(
    data: RegisterSchema
):
    return await register_controller(data)


# ==========================================
# LOGIN
# ==========================================

@router.post(
    "/login",
    status_code=status.HTTP_200_OK
)
async def login(
    data: LoginSchema
):
    return await login_controller(data)


# ==========================================
# FORGOT PASSWORD
# ==========================================

@router.post(
    "/forgot-password",
    status_code=status.HTTP_200_OK
)
async def forgot_password(
    data: ForgotPasswordSchema
):
    return await forgot_password_controller(data)


# ==========================================
# RESET PASSWORD
# ==========================================

@router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK
)
async def reset_password(
    data: ResetPasswordSchema
):
    return await reset_password_controller(data)