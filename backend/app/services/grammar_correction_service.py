import re


class GrammarCorrectionService:
    """
    Performs lightweight grammar and formatting cleanup
    on Whisper transcripts.
    """

    def correct(self, text: str):

        if not text.strip():

            return {
                "original_text": "",
                "corrected_text": "",
                "modified": False
            }

        corrected = text.strip()

        # Remove repeated spaces
        corrected = re.sub(r"\s+", " ", corrected)

        # Capitalize first letter
        corrected = corrected[0].upper() + corrected[1:]

        # Add punctuation if missing
        if corrected[-1] not in ".!?":
            corrected += "."

        modified = corrected != text

        return {
            "original_text": text,
            "corrected_text": corrected,
            "modified": modified
        }


grammar_correction_service = GrammarCorrectionService()