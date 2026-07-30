import os
import uuid
import edge_tts


class TextToSpeechService:

    def __init__(self):

        self.voice_map = {

            "en": "en-US-AriaNeural",
            "hi": "hi-IN-SwaraNeural",
            "te": "te-IN-ShrutiNeural",
            "ta": "ta-IN-PallaviNeural",
            "es": "es-ES-ElviraNeural",
            "fr": "fr-FR-DeniseNeural",
            "de": "de-DE-KatjaNeural",
            "it": "it-IT-ElsaNeural",
            "pt": "pt-BR-FranciscaNeural",
            "ja": "ja-JP-NanamiNeural",
            "ko": "ko-KR-SunHiNeural",
            "zh": "zh-CN-XiaoxiaoNeural"

        }

        self.output_folder = "generated_audio"

        os.makedirs(
            self.output_folder,
            exist_ok=True
        )

    async def text_to_speech(
        self,
        text: str,
        language: str
    ):

        try:

            if not text.strip():

                return {

                    "success": False,
                    "message": "Text is empty"

                }

            voice = self.voice_map.get(
                language,
                "en-US-AriaNeural"
            )

            filename = f"{uuid.uuid4()}.mp3"

            filepath = os.path.join(
                self.output_folder,
                filename
            )

            communicate = edge_tts.Communicate(
                text=text,
                voice=voice
            )

            await communicate.save(filepath)

            return {

                "success": True,
                "message": "Audio generated successfully",
                "language": language,
                "voice": voice,
                "filename": filename,
                "filepath": filepath

            }

        except Exception as e:

            return {

                "success": False,
                "message": str(e)

            }


text_to_speech_service = TextToSpeechService()