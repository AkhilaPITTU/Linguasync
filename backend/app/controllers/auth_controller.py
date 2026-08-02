from fastapi import HTTPException, status

from app.services.auth_service import (
    register_user,
    login_user,
    forgot_password,
    reset_password,
)

from app.schemas.user_schema import (
    RegisterSchema,
    LoginSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema,
)


# ==========================================
# REGISTER
# ==========================================

async def register_controller(data: RegisterSchema):

    try:

        result = await register_user(data)

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )

        return result

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ==========================================
# LOGIN
# ==========================================

async def login_controller(data: LoginSchema):

    try:

        result = await login_user(data)

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=result["message"]
            )

        return result

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ==========================================
# FORGOT PASSWORD
# ==========================================

async def forgot_password_controller(
    data: ForgotPasswordSchema
):

    try:

        result = await forgot_password(
            data.email
        )

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )

        return result

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ==========================================
# RESET PASSWORD
# ==========================================

async def reset_password_controller(
    data: ResetPasswordSchema
):

    try:

        result = await reset_password(
            data.token,
            data.password
        )

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )

        return result

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )