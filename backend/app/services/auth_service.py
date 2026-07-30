from datetime import datetime, timezone

from app.services.email_service import send_reset_email
from app.config.database import users_collection
from app.config.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_reset_token,
    verify_reset_token,
)

from app.models.User import User


# ==========================================
# REGISTER USER
# ==========================================

async def register_user(data):

    existing_user = await users_collection.find_one(
        {"email": data.email}
    )

    if existing_user:
        return {
            "success": False,
            "message": "Email already exists."
        }

    user = User(

        full_name=data.full_name,

        email=data.email,

        password=hash_password(data.password)

    )

    await users_collection.insert_one(
        user.model_dump()
    )

    return {
        "success": True,
        "message": "Registration Successful"
    }


# ==========================================
# LOGIN USER
# ==========================================

async def login_user(data):

    user = await users_collection.find_one(
        {
            "email": data.email
        }
    )

    if not user:
        return {
            "success": False,
            "message": "Invalid Email"
        }

    if not verify_password(
        data.password,
        user["password"]
    ):
        return {
            "success": False,
            "message": "Invalid Password"
        }

    token = create_access_token(
        {
            "user_id": str(user["_id"]),
            "email": user["email"],
            "role": user.get("role", "user")
        }
    )

    await users_collection.update_one(
        {
            "_id": user["_id"]
        },
        {
            "$set": {
                "last_login": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    return {

        "success": True,

        "access_token": token,

        "token_type": "bearer",

        "user": {

            "id": str(user["_id"]),

            "name": user["full_name"],

            "email": user["email"],

            "role": user.get("role", "user"),

            "is_verified": user.get("is_verified", False)

        }

    }


# ==========================================
# FORGOT PASSWORD
# ==========================================

async def forgot_password(email):

    user = await users_collection.find_one(
        {
            "email": email
        }
    )

    if not user:
        return {
            "success": False,
            "message": "Email not found"
        }

    token = create_reset_token(email)

    await users_collection.update_one(
        {
            "_id": user["_id"]
        },
        {
            "$set": {
                "reset_token": token,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    await send_reset_email(
        email,
        token
    )

    return {
        "success": True,
        "message": "Password reset link sent successfully."
    }


# ==========================================
# RESET PASSWORD
# ==========================================

async def reset_password(

    token,

    new_password

):

    email = verify_reset_token(token)

    if email is None:
        return {
            "success": False,
            "message": "Invalid or Expired Reset Token"
        }

    user = await users_collection.find_one(
        {
            "email": email,
            "reset_token": token
        }
    )

    if not user:
        return {
            "success": False,
            "message": "Invalid Reset Token"
        }

    hashed = hash_password(
        new_password
    )

    await users_collection.update_one(
        {
            "_id": user["_id"]
        },
        {
            "$set": {
                "password": hashed,
                "updated_at": datetime.now(timezone.utc)
            },
            "$unset": {
                "reset_token": ""
            }
        }
    )

    return {
        "success": True,
        "message": "Password Updated Successfully"
    }