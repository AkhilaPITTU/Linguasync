import logging
import os
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

from app.ai.language_config import LANGUAGE_ALIASES, SUPPORTED_LANGUAGES, language_code

load_dotenv()

REQUEST_TIMEOUT_SECONDS = 15

DEEPL_API_KEY = os.getenv("DEEPL_API_KEY", "").strip()
# DeepL issues two kinds of keys: a Free-tier key (always ends with the
# literal suffix ":fx") which must call the api-free.deepl.com host, and a
# Pro/paid key which calls api.deepl.com. Using the wrong host for a given
# key returns an authentication error even though the key itself is valid.
DEEPL_API_URL = (
    "https://api-free.deepl.com/v2/translate"
    if DEEPL_API_KEY.endswith(":fx")
    else "https://api.deepl.com/v2/translate"
)


LANGUAGE_CODES = SUPPORTED_LANGUAGES
_LANGUAGE_ALIASES = LANGUAGE_ALIASES

# This app's internal ISO codes (from language_config.SUPPORTED_LANGUAGES)
# mapped to DeepL's own language codes. DeepL's *source* codes are the plain
# upper-cased ISO code, but its *target* codes require a region suffix for
# English specifically -- DeepL rejects a bare "EN" as a target language,
# it must be "EN-US" or "EN-GB". If DeepL does not actually support a given
# code (this app's language list includes a few, such as Kannada, whose
# DeepL support is unconfirmed), the API call below will fail with a clear
# "target_lang not supported"-style error from DeepL itself, which is
# caught, logged, and falls back to the original transcript exactly like
# any other translation failure -- it will not crash the meeting.
_DEEPL_SOURCE_CODES = {
    "en": "EN", "hi": "HI", "te": "TE", "ta": "TA", "kn": "KN",
    "bn": "BN", "mr": "MR", "gu": "GU", "pa": "PA", "ur": "UR",
    "as": "AS", "ne": "NE",
}
_DEEPL_TARGET_CODES = {**_DEEPL_SOURCE_CODES, "en": "EN-US"}

# Kept as a fast, known-good shortcut for very short, common phrases (this
# started as a workaround for MyMemory mistranslating them; retained after
# the switch to DeepL below since it's still a free, zero-latency safety net
# and does no harm). Longer, less common phrases go through DeepL.
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
    """Translate text through the DeepL API (an authenticated, quota-based
    service) without retaining local ML models.

    Previously used Google Translate's free/unofficial web endpoint (via
    deep-translator), and before that MyMemory's free REST API. Both were
    replaced because their free, unauthenticated endpoints silently
    rate-limit or block requests from shared cloud IPs (such as Render's).
    DeepL is a real authenticated API with a documented per-account quota
    instead of an IP-based throttle on a scraped page, so it does not share
    that failure mode.
    """

    def get_language_code(self, language, default="en"):
        """Resolve display names and BCP-47 tags without forcing English."""
        normalized = str(language or "").strip().casefold()
        if not normalized:
            return default

        # Clients and legacy MongoDB records can use BCP-47 values such as
        # ``hi-IN``. Deepgram and DeepL both require the base ISO code.
        return language_code(normalized, default)

    def _lookup_common_translation(self, cleaned_text, source_code, target_code):
        """Return a known-good translation for common short phrases, if any.

        Looks up ``cleaned_text`` in COMMON_TRANSLATIONS for the given
        (source_code, target_code) pair. Matching is case-insensitive
        (casefold) and ignores surrounding/trailing punctuation, so "Hello",
        "hello!" and "Hello." all match the same "hello" entry. Returns
        None when there is no dictionary for the language pair or no match
        for the phrase, in which case the caller should fall back to DeepL.
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
        source_code = self.get_language_code(source_lang, default=None)
        target_code = self.get_language_code(target_lang, default=None)
        if not source_code or not target_code:
            # Diagnostics only -- does not change the returned reason/behavior
            # below. Logged separately for source and target so a caller
            # reading Render logs can tell at a glance which side of the
            # language pair failed to resolve, without guessing from the
            # combined "unsupported_language" reason alone.
            if not target_code:
                print(
                    "Unsupported recipient language: "
                    f"{target_lang}\nResolved language code: {target_code!r}"
                )
            if not source_code:
                print(
                    "Unsupported source language: "
                    f"{source_lang}\nResolved language code: {source_code!r}"
                )
            logger.error(
                "Language resolution failed -> source_lang=%r source_code=%r "
                "target_lang=%r target_code=%r",
                source_lang, source_code, target_lang, target_code,
            )
            return {
                "success": False,
                "translated_text": None,
                "reason": "unsupported_language",
                "message": "Source and target languages must be supported live-meeting languages.",
            }

        if source_code == target_code:
            return {
                "success": True,
                "translated_text": cleaned_text,
                "reason": None,
            }

        # Short-phrase dictionary lookup: bypass DeepL entirely for common
        # greetings/short phrases (kept as a free, instant shortcut for the
        # highest-traffic phrases).
        common_translation = self._lookup_common_translation(
            cleaned_text, source_code, target_code
        )
        if common_translation is not None:
            logger.info("Common phrase translation used (DeepL not called)")
            return {
                "success": True,
                "translated_text": common_translation,
                "reason": None,
            }

        if not DEEPL_API_KEY:
            logger.error("DEEPL_API_KEY is not set; cannot call the DeepL API")
            print(
                "DeepL API key is not configured "
                "(DEEPL_API_KEY env var is missing or empty)."
            )
            return {
                "success": True,
                "translated_text": cleaned_text,
                "reason": "translation_fallback",
                "message": "DeepL API key is not configured.",
            }

        deepl_source = _DEEPL_SOURCE_CODES.get(source_code)
        deepl_target = _DEEPL_TARGET_CODES.get(target_code)
        if not deepl_source or not deepl_target:
            logger.error(
                "No DeepL language-code mapping for source_code=%s target_code=%s",
                source_code, target_code,
            )
            print(
                "DeepL language mapping unavailable: "
                f"source_code={source_code!r} target_code={target_code!r}"
            )
            return {
                "success": True,
                "translated_text": cleaned_text,
                "reason": "translation_fallback",
                "message": "DeepL language mapping unavailable for this language pair.",
            }

        try:
            response = requests.post(
                DEEPL_API_URL,
                headers={"Authorization": f"DeepL-Auth-Key {DEEPL_API_KEY}"},
                data={
                    "text": cleaned_text,
                    "source_lang": deepl_source,
                    "target_lang": deepl_target,
                },
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            payload = response.json()
            translations = payload.get("translations") or []
            translated_text = translations[0].get("text") if translations else None

            if not isinstance(translated_text, str) or not translated_text.strip():
                raise ValueError("DeepL response did not contain translated text")

            logger.info("DeepL translation successful")
            return {
                "success": True,
                "translated_text": translated_text.strip(),
                "reason": None,
            }
        except (requests.RequestException, ValueError, TypeError, KeyError, IndexError) as error:
            # Translation must never interrupt a live meeting. Return source
            # text as a usable subtitle when DeepL is unavailable. This is a
            # genuine failure of the DeepL call, not a normal outcome -- log
            # it loudly and with full context (including DeepL's own error
            # body, which names things like an unsupported target_lang
            # explicitly) so Render logs identify the exact cause instead of
            # the failure being indistinguishable from a real, successful
            # translation.
            response_body_preview = None
            response_obj = getattr(error, "response", None)
            if response_obj is not None:
                try:
                    response_body_preview = response_obj.text[:300]
                except Exception:
                    response_body_preview = None

            failed_at = datetime.now(timezone.utc).isoformat()
            logger.error(
                "DeepL translation request failed: exception_type=%s exception_message=%s "
                "source_language=%s target_language=%s input_text_preview=%r "
                "response_body_preview=%r timestamp=%s",
                type(error).__name__,
                str(error),
                deepl_source,
                deepl_target,
                cleaned_text[:100],
                response_body_preview,
                failed_at,
            )
            print(
                "===============================\n"
                "TRANSLATION FAILED\n"
                f"Source: {deepl_source}\n"
                f"Target: {deepl_target}\n"
                f"Reason: {error}\n"
                + (f"DeepL response: {response_body_preview}\n" if response_body_preview else "")
                + "Falling back to original transcript.\n"
                "==============================="
            )
            return {
                "success": True,
                "translated_text": cleaned_text,
                "reason": "translation_fallback",
                "message": str(error),
            }


translation_service = TranslationService()
