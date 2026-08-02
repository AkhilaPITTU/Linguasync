import os

from app.services.speech_to_text_service import (
    speech_to_text_service
)

from app.services.translation_service import (
    translate_text
)

from app.services.text_to_speech_service import (
    text_to_speech_service
)


class RealtimeTranslationService:

    async def realtime_translate(
        self,
        audio_path: str,
        target_language: str
    ):

        try:

            speech_result = await speech_to_text_service.speech_to_text(
                audio_path
            )

            if not speech_result["success"]:
                return speech_result

            original_text = speech_result["text"]

            source_language = speech_result["language"]

            translation_result = await translate_text(
                text=original_text,
                source_language=source_language,
                target_language=target_language
            )

            if not translation_result["success"]:
                return translation_result

            translated_text = translation_result["translated_text"]

            tts_result = await text_to_speech_service.text_to_speech(
                text=translated_text,
                language=target_language
            )

            if not tts_result["success"]:
                return tts_result

            return {

                "success": True,

                "source_language": source_language,

                "target_language": target_language,

                "original_text": original_text,

                "translated_text": translated_text,

                "audio_path": tts_result["filepath"]

            }

        except Exception as e:

            return {

                "success": False,

                "message": str(e)

            }


realtime_translation_service = RealtimeTranslationService()