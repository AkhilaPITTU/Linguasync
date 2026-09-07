from app.ai.whisper_service import whisper_service


# ==========================================
# WHISPER MODEL (shared, lazy-loaded)
# ==========================================
# This service used to create its own separate faster-whisper "small"/int8
# instance at import time, identical to the one in app/ai/whisper_service.py.
# Both eager loads happening during app startup were a direct contributor to
# the Render out-of-memory crash. They now share the single lazy-loaded
# instance owned by whisper_service, loaded on first actual use.


class SpeechToTextService:

    # ==========================================
    # SPEECH TO TEXT
    # ==========================================

    async def speech_to_text(
        self,
        audio_path: str
    ):

        try:

            model = whisper_service.get_model()

            segments, info = model.transcribe(

                audio_path,

                beam_size=5,

                vad_filter=True

            )

            transcript = " ".join(
                segment.text.strip()
                for segment in segments
            ).strip()

            return {

                "success": True,

                "message": "Speech converted to text successfully",

                "language": info.language,

                "language_probability": round(
                    info.language_probability,
                    4
                ),

                "text": transcript

            }

        except FileNotFoundError:

            return {

                "success": False,

                "message": "Audio file not found.",

                "language": None,

                "language_probability": 0,

                "text": ""

            }

        except Exception as e:

            return {

                "success": False,

                "message": str(e),

                "language": None,

                "language_probability": 0,

                "text": ""

            }


# ==========================================
# Singleton Instance
# ==========================================

speech_to_text_service = SpeechToTextService()
