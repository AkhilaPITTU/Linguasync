from datetime import datetime
from bson import ObjectId

from app.config.database import database


class AIFeedbackService:

    def __init__(self):

        self.collection = database["ai_feedback"]

    async def save_feedback(
        self,
        meeting_id,
        user_id,
        original_text,
        corrected_text,
        translated_text,
        whisper_confidence,
        audio_quality,
        speech_accuracy,
        overall_confidence,
        confidence_level,
        review_required
    ):

        document = {

            "meeting_id": meeting_id,

            "user_id": user_id,

            "original_text": original_text,

            "corrected_text": corrected_text,

            "translated_text": translated_text,

            "human_translation": None,

            "edited": False,

            "whisper_confidence": whisper_confidence,

            "audio_quality": audio_quality,

            "speech_accuracy": speech_accuracy,

            "overall_confidence": overall_confidence,

            "confidence_level": confidence_level,

            "review_required": review_required,

            "created_at": datetime.utcnow(),

            "updated_at": datetime.utcnow()

        }

        result = await self.collection.insert_one(document)

        document["_id"] = str(result.inserted_id)

        return document

    async def update_human_translation(
        self,
        feedback_id,
        human_translation
    ):

        result = await self.collection.update_one(

            {
                "_id": ObjectId(feedback_id)
            },

            {
                "$set": {

                    "human_translation": human_translation,

                    "edited": True,

                    "updated_at": datetime.utcnow()

                }

            }

        )

        return result.modified_count

    async def get_feedback(
        self,
        feedback_id
    ):

        feedback = await self.collection.find_one(

            {
                "_id": ObjectId(feedback_id)
            }

        )

        if feedback:

            feedback["_id"] = str(feedback["_id"])

        return feedback

    async def get_meeting_feedback(
        self,
        meeting_id
    ):

        feedback_list = []

        cursor = self.collection.find(

            {
                "meeting_id": meeting_id
            }

        )

        async for feedback in cursor:

            feedback["_id"] = str(feedback["_id"])

            feedback_list.append(feedback)

        return feedback_list

    async def delete_feedback(
        self,
        feedback_id
    ):

        result = await self.collection.delete_one(

            {
                "_id": ObjectId(feedback_id)
            }

        )

        return result.deleted_count


ai_feedback_service = AIFeedbackService()