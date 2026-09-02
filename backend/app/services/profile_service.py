from bson import ObjectId
from datetime import datetime, timezone

from app.config.database import users_collection


async def profile_service(user_id: str):

    user = await users_collection.find_one(
        {
            "_id": ObjectId(user_id)
        }
    )

    if not user:

        return {
            "success": False,
            "message": "User not found"
        }

    return {

        "success": True,

        "data": {

            "full_name": user.get("full_name"),

            "email": user.get("email"),

            "membership": user.get(
                "membership",
                "Free"
            ),

            "preferred_language": user.get(
                "preferred_language",
                "English"
            ),

            "output_mode": user.get("output_mode", "none"),

            "total_calls": user.get(
                "total_calls",
                0
            ),

            "video_calls": user.get(
                "video_calls",
                0
            ),

            "audio_calls": user.get(
                "audio_calls",
                0
            )

        }

    }


async def update_profile_service(user_id: str, updates: dict):
    allowed = {
        key: value for key, value in updates.items()
        if key in {"full_name", "preferred_language", "output_mode"}
    }

    if not allowed:
        return {"success": False, "message": "No profile changes supplied"}

    allowed["updated_at"] = datetime.now(timezone.utc)
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": allowed},
    )

    if not result.matched_count:
        return {"success": False, "message": "User not found"}

    return await profile_service(user_id)
