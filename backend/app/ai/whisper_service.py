import gc
import os
import tempfile
from threading import Lock

import numpy as np

from faster_whisper import WhisperModel


class WhisperService:

    def __init__(self):

        # This singleton is initialized during FastAPI startup and reused by
        # every transcription. It is never released during a meeting.
        self._model = None
        self._model_lock = Lock()

    def get_model(self):
        """Return the shared faster-whisper model, loading it on first use."""

        if self._model is None:
            with self._model_lock:
                if self._model is None:
                    print("Loading Whisper model: tiny (device=cpu, compute_type=int8)")
                    self._model = WhisperModel(
                        "tiny",
                        device="cpu",
                        compute_type="int8"
                    )

        return self._model

    def _logprob_to_confidence(self, avg_logprob: float) -> float:
        """
        Convert Whisper average log probability
        into an approximate confidence percentage.
        """

        confidence = (avg_logprob + 1.0) * 100

        confidence = max(0, min(confidence, 100))

        return round(confidence, 2)

    def transcribe(self, audio, vad_filter=True, language=None):

        if audio is None or (hasattr(audio, "size") and audio.size == 0) or (
            isinstance(audio, (bytes, bytearray)) and not audio
        ):
            return {
                "success": False,
                "reason": "empty_audio",
                "language": None,
                "text": "",
                "confidence": 0,
                "segments": [],
            }

        temp_path = None

        # The meeting pipeline supplies validated mono float32 PCM at 16 kHz.
        # Retain WebM-file support for other existing callers.
        if isinstance(audio, (bytes, bytearray)):
            with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
                temp_audio.write(audio)
                temp_path = temp_audio.name
            whisper_audio = temp_path
        else:
            # Faster-Whisper expects one-dimensional, normalized float audio
            # when a NumPy array is supplied. The meeting decoder already
            # provides 16 kHz mono PCM; this verifies that boundary without
            # changing its amplitude.
            whisper_audio = np.ascontiguousarray(
                np.nan_to_num(
                    np.asarray(audio, dtype=np.float32),
                    nan=0.0,
                    posinf=0.0,
                    neginf=0.0,
                ).reshape(-1)
            )

        try:

            try:
                print(
                    f"[WHISPER-LANGUAGE-TRACE] task=transcribe "
                    f"requested_language={language or None}"
                )
                segments, info = self.get_model().transcribe(
                    whisper_audio,
                    task="transcribe",
                    beam_size=5,
                    temperature=0.0,
                    vad_filter=vad_filter,
                    condition_on_previous_text=False,
                    language=language or None,
                )
                # Faster-Whisper returns a lazy generator. Materialize it
                # once before extracting text and diagnostics.
                segments = list(segments)
            except Exception as error:
                return {
                    "success": False,
                    "reason": f"whisper_error: {error}",
                    "language": None,
                    "text": "",
                    "confidence": 0,
                    "segments": [],
                }

            transcript = ""

            confidence_values = []

            segment_data = []

            for segment in segments:

                transcript += segment.text + " "

                avg_logprob = getattr(
                    segment,
                    "avg_logprob",
                    -1.0
                )

                confidence = self._logprob_to_confidence(
                    avg_logprob
                )

                confidence_values.append(confidence)

                segment_data.append({

                    "start": segment.start,

                    "end": segment.end,

                    "text": segment.text,

                    "confidence": confidence,
                    "avg_logprob": avg_logprob,
                    "no_speech_prob": getattr(segment, "no_speech_prob", None),
                    "compression_ratio": getattr(segment, "compression_ratio", None),

                })

            overall_confidence = (

                round(

                    sum(confidence_values) /

                    len(confidence_values),

                    2

                )

                if confidence_values

                else 0

            )

            detected_language = getattr(info, "language", None)
            detected_probability = getattr(info, "language_probability", None)
            print(
                f"[WHISPER-LANGUAGE-TRACE] requested_language={language or None} "
                f"detected_language={detected_language} "
                f"language_probability={detected_probability}"
            )

            return {

                "success": True,

                "language": detected_language,

                "language_probability": getattr(
                    info, "language_probability", None
                ),

                "text": transcript.strip(),

                "confidence": overall_confidence,

                "segments": segment_data

            }

        finally:

            if temp_path and os.path.exists(temp_path):

                os.remove(temp_path)

            # Release per-request audio/decoding objects. The global Whisper
            # singleton is deliberately retained for later requests.
            try:
                del whisper_audio
            except UnboundLocalError:
                pass
            gc.collect()


whisper_service = WhisperService()
