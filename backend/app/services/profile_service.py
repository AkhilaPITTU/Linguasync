import uuid
from pathlib import Path

from bson import ObjectId
from datetime import datetime, timezone

from app.config.database import meetings_collection, users_collection
from app.config.settings import settings

MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_PROFILE_IMAGE_TYPES = {"image/png": ".png", "image/jpeg": ".jpg"}


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

    meeting_filter = {
        "$or": [
            {"host_id": user_id},
            {"participants.user_id": user_id},
        ]
    }
    total_calls = await meetings_collection.count_documents(meeting_filter)
    video_calls = await meetings_collection.count_documents({
        "$and": [meeting_filter, {"meeting_type": "video"}],
    })
    audio_calls = await meetings_collection.count_documents({
        "$and": [meeting_filter, {"meeting_type": "audio"}],
    })

    return {

        "success": True,

        "data": {

            "full_name": user.get("full_name"),

            "email": user.get("email"),

            "profile_image": user.get("profile_image"),

            "membership": user.get(
                "membership",
                "Free"
            ),

            "preferred_language": user.get(
                "preferred_language",
                "English"
            ),

            "output_mode": user.get("output_mode", "none"),

            "total_calls": total_calls,

            "video_calls": video_calls,

            "audio_calls": audio_calls

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


async def update_profile_image_service(user_id: str, image) -> dict:
    """Validate and persist one profile image, returning the refreshed profile."""
    content_type = (image.content_type or "").lower()
    extension = ALLOWED_PROFILE_IMAGE_TYPES.get(content_type)
    if not extension:
        return {"success": False, "message": "Profile image must be a PNG, JPG, or JPEG file."}

    image_bytes = await image.read(MAX_PROFILE_IMAGE_BYTES + 1)
    if not image_bytes:
        return {"success": False, "message": "Profile image is empty."}
    if len(image_bytes) > MAX_PROFILE_IMAGE_BYTES:
        return {"success": False, "message": "Profile image must be 5 MB or smaller."}

    signatures = {
        ".png": b"\x89PNG\r\n\x1a\n",
        ".jpg": b"\xff\xd8\xff",
    }
    if not image_bytes.startswith(signatures[extension]):
        return {"success": False, "message": "Profile image contents do not match its file type."}

    directory = Path(settings.PROFILE_IMAGE_FOLDER)
    directory.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{extension}"
    (directory / filename).write_bytes(image_bytes)
    image_url = f"/profile-images/{filename}"

    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"profile_image": image_url, "updated_at": datetime.now(timezone.utc)}},
    )
    if not result.matched_count:
        try:
            (directory / filename).unlink(missing_ok=True)
        except OSError:
            pass
        return {"success": False, "message": "User not found"}

    return await profile_service(user_id)
