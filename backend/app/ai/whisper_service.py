import os
import tempfile

from faster_whisper import WhisperModel


class WhisperService:

    def __init__(self):

        self.model = WhisperModel(
            "small",
            device="cpu",
            compute_type="int8"
        )

    def _logprob_to_confidence(self, avg_logprob: float) -> float:
        """
        Convert Whisper average log probability
        into an approximate confidence percentage.
        """

        confidence = (avg_logprob + 1.0) * 100

        confidence = max(0, min(confidence, 100))

        return round(confidence, 2)

    def transcribe(self, audio_bytes):

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".wemb"
        ) as temp_audio:

            temp_audio.write(audio_bytes)

            temp_path = temp_audio.name

        try:

            segments, info = self.model.transcribe(
                temp_path,
                beam_size=5,
                vad_filter=True
            )

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

                    "confidence": confidence

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

            return {

                "language": info.language,

                "text": transcript.strip(),

                "confidence": overall_confidence,

                "segments": segment_data

            }

        finally:

            if os.path.exists(temp_path):

                os.remove(temp_path)


whisper_service = WhisperService()