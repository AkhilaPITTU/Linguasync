from faster_whisper import WhisperModel


# ==========================================
# LOAD WHISPER MODEL (Loaded once)
# ==========================================

model = WhisperModel(
    "small",
    device="cpu",          # Change to "cuda" if GPU is available
    compute_type="int8"
)


class SpeechToTextService:

    def __init__(self):

        self.model = model

    # ==========================================
    # SPEECH TO TEXT
    # ==========================================

    async def speech_to_text(
        self,
        audio_path: str
    ):

        try:

            segments, info = self.model.transcribe(

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