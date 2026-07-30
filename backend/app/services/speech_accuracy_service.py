import re


class SpeechAccuracyService:
    """
    Speech Accuracy Service

    Estimates the reliability of the transcript
    produced by Whisper.

    Returns:
    {
        "accuracy": float,
        "status": str,
        "message": str
    }
    """

    def analyze(self, transcript: str, whisper_confidence: float):

        if not transcript.strip():

            return {
                "accuracy": 0.0,
                "status": "poor",
                "message": "No speech detected."
            }

        words = transcript.split()

        word_count = len(words)

        long_words = sum(
            1 for word in words if len(word) > 2
        )

        alphabetic_words = sum(
            1 for word in words
            if re.match(r"^[A-Za-z]+$", word)
        )

        completeness_score = min(
            (word_count / 10) * 100,
            100
        )

        alphabet_score = (
            (alphabetic_words / word_count) * 100
            if word_count > 0
            else 0
        )

        meaningful_score = (
            (long_words / word_count) * 100
            if word_count > 0
            else 0
        )

        accuracy = (
            whisper_confidence * 0.60 +
            completeness_score * 0.15 +
            alphabet_score * 0.15 +
            meaningful_score * 0.10
        )

        accuracy = round(min(accuracy, 100), 2)

        if accuracy >= 85:

            status = "excellent"

        elif accuracy >= 70:

            status = "good"

        elif accuracy >= 50:

            status = "fair"

        else:

            status = "poor"

        return {

            "accuracy": accuracy,

            "status": status,

            "message": f"Speech quality is {status}."

        }


speech_accuracy_service = SpeechAccuracyService()