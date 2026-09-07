import logging

import requests


MYMEMORY_URL = "https://api.mymemory.translated.net/get"
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
    "hindi (india)": "hi",
    "hi": "hi",
    "telugu": "te",
    "telugu (india)": "te",
    "te": "te",
}

# MyMemory frequently mistranslates very short, common phrases (e.g. a bare
# "Hello" can come back as an unrelated sentence). For these well-known
# greetings/short phrases we skip the HTTP call entirely and return a known
# good translation. Longer, less common phrases still go through MyMemory.
COMMON_TRANSLATIONS = {
    ("en", "hi"): {
        "hello": "नमस्ते",
        "hi": "नमस्ते",
        "good morning": "सुप्रभात",
        "good evening": "शुभ संध्या",
        "thank you": "धन्यवाद",
        "thanks": "धन्यवाद",
        "yes": "हाँ",
        "no": "नहीं",
        "welcome": "स्वागत है",
    },
    ("en", "te"): {
        "hello": "నమస్కారం",
        "hi": "నమస్కారం",
        "good morning": "శుభోదయం",
        "good evening": "శుభ సాయంత్రం",
        "thank you": "ధన్యవాదాలు",
        "thanks": "ధన్యవాదాలు",
        "yes": "అవును",
        "no": "కాదు",
        "welcome": "స్వాగతం",
    },
    ("hi", "en"): {
        "नमस्ते": "Hello",
        "धन्यवाद": "Thank you",
        "हाँ": "Yes",
        "नहीं": "No",
    },
    ("te", "en"): {
        "నమస్కారం": "Hello",
        "ధన్యవాదాలు": "Thank you",
        "అవును": "Yes",
        "కాదు": "No",
    },
}

# Trailing punctuation that should be ignored when matching against
# COMMON_TRANSLATIONS (e.g. "Hello!" or "hello." should still match "hello").
_LOOKUP_STRIP_CHARS = ".,!?;: "

logger = logging.getLogger(__name__)


class TranslationService:
    """Translate text through the MyMemory Translation API without retaining local ML models."""

    def get_language_code(self, language, default="en"):
        """Resolve display names and BCP-47 tags without forcing English."""
        normalized = str(language or "").strip().casefold()
        if not normalized:
            return default

        # Clients and legacy MongoDB records can use BCP-47 values such as
        # ``hi-IN``. Whisper and MyMemory require the base ISO code.
        base_code = normalized.replace("_", "-").split("-", 1)[0]
        return _LANGUAGE_ALIASES.get(
            normalized,
            _LANGUAGE_ALIASES.get(base_code, default),
        )

    def _lookup_common_translation(self, cleaned_text, source_code, target_code):
        """Return a known-good translation for common short phrases, if any.

        Looks up ``cleaned_text`` in COMMON_TRANSLATIONS for the given
        (source_code, target_code) pair. Matching is case-insensitive
        (casefold) and ignores surrounding/trailing punctuation, so "Hello",
        "hello!" and "Hello." all match the same "hello" entry. Returns
        None when there is no dictionary for the language pair or no match
        for the phrase, in which case the caller should fall back to
        MyMemory.
        """
        phrase_map = COMMON_TRANSLATIONS.get((source_code, target_code))
        if not phrase_map:
            return None

        normalized_phrase = cleaned_text.strip(_LOOKUP_STRIP_CHARS).casefold()
        if not normalized_phrase:
            return None

        return phrase_map.get(normalized_phrase)

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

        # Short-phrase dictionary lookup: bypass MyMemory entirely for
        # common greetings/short phrases it is known to mistranslate.
        common_translation = self._lookup_common_translation(
            cleaned_text, source_code, target_code
        )
        if common_translation is not None:
            logger.info("Common phrase translation used (MyMemory not called)")
            return {
                "success": True,
                "translated_text": common_translation,
                "reason": None,
            }

        try:
            response = requests.get(
                MYMEMORY_URL,
                params={
                    "q": cleaned_text,
                    "langpair": f"{source_code}|{target_code}",
                },
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            payload = response.json()
            response_data = payload.get("responseData") or {}
            translated_text = response_data.get("translatedText")
            response_status = payload.get("responseStatus")

            if response_status not in (200, "200"):
                raise ValueError(
                    f"MyMemory returned responseStatus={response_status!r}"
                )
            if not isinstance(translated_text, str) or not translated_text.strip():
                raise ValueError("MyMemory response did not contain translatedText")

            logger.info("MyMemory translation successful")
            return {
                "success": True,
                "translated_text": translated_text.strip(),
                "reason": None,
            }
        except (requests.RequestException, ValueError, TypeError) as error:
            # Translation must never interrupt a live meeting. Return source
            # text as a usable subtitle when the public service is unavailable.
            logger.warning("MyMemory translation failed: %s", error)
            return {
                "success": True,
                "translated_text": cleaned_text,
                "reason": "translation_fallback",
                "message": str(error),
            }


translation_service = TranslationService()
