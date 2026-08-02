from bson import ObjectId

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