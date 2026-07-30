class ConfidenceService:
    """
    Calculates the overall AI confidence score.

    Combines:
    - Whisper confidence
    - Audio quality
    - Speech accuracy
    """

    def calculate(
        self,
        whisper_confidence: float,
        audio_quality: float,
        speech_accuracy: float
    ):

        overall = (
            whisper_confidence * 0.50 +
            audio_quality * 0.20 +
            speech_accuracy * 0.30
        )

        overall = round(min(max(overall, 0), 100), 2)

        if overall >= 90:
            level = "Very High"

        elif overall >= 75:
            level = "High"

        elif overall >= 60:
            level = "Medium"

        elif overall >= 40:
            level = "Low"

        else:
            level = "Very Low"

        return {
            "confidence": overall,
            "level": level
        }


confidence_service = ConfidenceService()