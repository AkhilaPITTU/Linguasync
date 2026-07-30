import numpy as np


class NoiseDetectionService:
    """
    Noise Detection Service

    Checks whether incoming audio is suitable for
    speech recognition.

    Returns:
    {
        "is_valid": bool,
        "audio_quality": float,
        "rms": float,
        "message": str
    }
    """

    def __init__(self):

        self.silence_threshold = 300
        self.good_audio_threshold = 1000

    def analyze(self, audio_bytes: bytes):

        if not audio_bytes:

            return {
                "is_valid": False,
                "audio_quality": 0.0,
                "rms": 0,
                "message": "Empty audio received."
            }

        try:

            samples = np.frombuffer(
                audio_bytes,
                dtype=np.int16
            )

            if samples.size == 0:

                return {
                    "is_valid": False,
                    "audio_quality": 0.0,
                    "rms": 0,
                    "message": "Invalid audio."
                }

            rms = np.sqrt(
                np.mean(
                    samples.astype(np.float32) ** 2
                )
            )

            if rms < self.silence_threshold:

                return {
                    "is_valid": False,
                    "audio_quality": 0.0,
                    "rms": round(float(rms), 2),
                    "message": "Silence detected."
                }

            quality = min(
                (rms / self.good_audio_threshold) * 100,
                100
            )

            return {

                "is_valid": True,

                "audio_quality": round(float(quality), 2),

                "rms": round(float(rms), 2),

                "message": "Audio accepted."

            }

        except Exception as e:

            return {

                "is_valid": False,

                "audio_quality": 0.0,

                "rms": 0,

                "message": str(e)

            }


noise_detection_service = NoiseDetectionService()