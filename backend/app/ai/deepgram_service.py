import io
import logging
import os
import wave

import numpy as np
import requests
from dotenv import load_dotenv

load_dotenv()

DEEPGRAM_API_URL = "https://api.deepgram.com/v1/listen"
DEEPGRAM_MODEL = "nova-3"
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
DEEPGRAM_TIMEOUT_SECONDS = 20
logger = logging.getLogger(__name__)


class DeepgramService:
    """Deepgram Nova-3 adapter used by the live WebSocket meeting path."""

    @staticmethod
    def _pcm_float32_to_wav_bytes(samples: np.ndarray, sample_rate: int = 16000) -> bytes:
        pcm16 = (np.clip(samples, -1.0, 1.0) * 32767.0).astype("<i2", copy=False)
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(pcm16.tobytes())
        return buffer.getvalue()

    def transcribe(self, audio, language: str, vad_filter=True):
        """Send fixed-language, validated audio to Deepgram; never detect language."""
        if not isinstance(language, str) or not language.strip():
            return self._failure("missing_configured_language")
        if audio is None or (hasattr(audio, "size") and audio.size == 0) or (
            isinstance(audio, (bytes, bytearray)) and not audio
        ):
            return self._failure("empty_audio")
        if not DEEPGRAM_API_KEY:
            logger.error("DEEPGRAM_API_KEY is not set")
            return self._failure("missing_deepgram_api_key")

        try:
            if isinstance(audio, (bytes, bytearray)):
                audio_bytes, content_type = bytes(audio), "audio/webm"
            else:
                samples = np.ascontiguousarray(
                    np.nan_to_num(np.asarray(audio, dtype=np.float32), nan=0.0, posinf=0.0, neginf=0.0).reshape(-1)
                )
                audio_bytes = self._pcm_float32_to_wav_bytes(samples)
                content_type = "audio/wav"

            response = requests.post(
                DEEPGRAM_API_URL,
                params={"model": DEEPGRAM_MODEL, "language": language.strip(), "punctuate": "true", "smart_format": "true"},
                headers={"Authorization": f"Token {DEEPGRAM_API_KEY}", "Content-Type": content_type},
                data=audio_bytes,
                timeout=DEEPGRAM_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            best = (
                ((response.json().get("results") or {}).get("channels") or [{}])[0]
                .get("alternatives", [{}])[0]
            )
            text = (best.get("transcript") or "").strip()
            confidence = round(min(max(float(best.get("confidence") or 0) * 100, 0), 100), 2)
            words = best.get("words") or []
            segments = [{
                "start": words[0].get("start", 0.0) if words else 0.0,
                "end": words[-1].get("end", 0.0) if words else 0.0,
                "text": text,
                "confidence": confidence,
            }] if text else []
            return {"success": True, "language": language.strip(), "text": text, "confidence": confidence, "segments": segments}
        except (requests.RequestException, ValueError, TypeError, KeyError, IndexError) as error:
            logger.error("Deepgram transcription failed: %s", error)
            return self._failure(f"deepgram_error: {error}")

    @staticmethod
    def _failure(reason):
        return {"success": False, "reason": reason, "language": None, "text": "", "confidence": 0, "segments": []}


deepgram_service = DeepgramService()
