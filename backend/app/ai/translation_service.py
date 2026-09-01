import logging

import requests


LIBRETRANSLATE_URL = "https://translate.argosopentech.com/translate"
REQUEST_TIMEOUT_SECONDS = 15

LANGUAGE_CODES = {
    "English": "en",
    "Hindi": "hi",
    "Telugu": "te",
}

_LANGUAGE_ALIASES = {
    "english": "en",
    "en": "en",
    "hindi": "hi",
    "hi": "hi",
    "telugu": "te",
    "te": "te",
}

logger = logging.getLogger(__name__)


class TranslationService:
    """Translate text through LibreTranslate without retaining local ML models."""

    def get_language_code(self, language):
        """Resolve a saved language preference; unavailable values use English."""
        return _LANGUAGE_ALIASES.get(str(language or "").strip().casefold(), "en")

    def translate(self, text, source_lang="English", target_lang="English"):
        """Keep the existing synchronous translation service contract."""
        if not isinstance(text, str) or not text.strip():
            return {
                "success": False,
                "translated_text": None,
                "reason": "empty_text",
                "message": "Text to translate is required.",
            }

        cleaned_text = text.strip()
        source_code = self.get_language_code(source_lang)
        target_code = self.get_language_code(target_lang)

        if source_code == target_code:
            return {
                "success": True,
                "translated_text": cleaned_text,
                "reason": None,
            }

        try:
            response = requests.post(
                LIBRETRANSLATE_URL,
                json={
                    "q": cleaned_text,
                    "source": source_code,
                    "target": target_code,
                    "format": "text",
                },
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            translated_text = response.json().get("translatedText")
            if not isinstance(translated_text, str) or not translated_text.strip():
                raise ValueError("LibreTranslate response did not contain translatedText")

            return {
                "success": True,
                "translated_text": translated_text.strip(),
                "reason": None,
            }
        except (requests.RequestException, ValueError, TypeError) as error:
            # Translation must never interrupt a live meeting. Return source
            # text as a usable subtitle when the public service is unavailable.
            logger.warning(
                "LibreTranslate fallback source=%s target=%s error=%s",
                source_code,
                target_code,
                type(error).__name__,
            )
            return {
                "success": True,
                "translated_text": cleaned_text,
                "reason": "translation_fallback",
                "message": str(error),
            }


translation_service = TranslationService()
