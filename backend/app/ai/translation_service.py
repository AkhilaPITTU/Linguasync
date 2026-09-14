import concurrent.futures
import logging
from datetime import datetime, timezone

from deep_translator import GoogleTranslator

from app.ai.language_config import LANGUAGE_ALIASES, SUPPORTED_LANGUAGES, language_code


# How long a single translation call may run before it's treated as a
# failure and the original transcript is delivered instead. Google's free
# web-translate endpoint (reached via deep-translator) exposes no timeout
# parameter of its own, so this is enforced with a worker-thread deadline
# inside translate() below rather than via a `requests` kwarg.
REQUEST_TIMEOUT_SECONDS = 15


LANGUAGE_CODES = SUPPORTED_LANGUAGES
_LANGUAGE_ALIASES = LANGUAGE_ALIASES

# Kept as a fast, known-good shortcut for very short, common phrases (this
# started as a workaround for MyMemory mistranslating them; retained after
# the switch to Google Translate below since it's still a free, zero-latency
# safety net and does no harm). Longer, less common phrases go through
# Google Translate.
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
    """Translate text through Google Translate's free web endpoint (via the
    deep-translator library) without retaining local ML models.

    Previously used MyMemory's REST API (api.mymemory.translated.net). That
    was replaced because MyMemory's free tier is aggressively IP-rate-limited
    and would silently return the untranslated source text -- marked as a
    "success" -- whenever a request from a shared cloud/datacenter IP (such
    as Render's) got throttled. Google Translate's free endpoint has no API
    key either, but is far less likely to reject a Render-origin request.
    """

    def get_language_code(self, language, default="en"):
        """Resolve display names and BCP-47 tags without forcing English."""
        normalized = str(language or "").strip().casefold()
        if not normalized:
            return default

        # Clients and legacy MongoDB records can use BCP-47 values such as
        # ``hi-IN``. Deepgram and Google Translate require the base ISO code.
        return language_code(normalized, default)

    def _lookup_common_translation(self, cleaned_text, source_code, target_code):
        """Return a known-good translation for common short phrases, if any.

        Looks up ``cleaned_text`` in COMMON_TRANSLATIONS for the given
        (source_code, target_code) pair. Matching is case-insensitive
        (casefold) and ignores surrounding/trailing punctuation, so "Hello",
        "hello!" and "Hello." all match the same "hello" entry. Returns
        None when there is no dictionary for the language pair or no match
        for the phrase, in which case the caller should fall back to
        Google Translate.
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

        # Short-phrase dictionary lookup: bypass Google Translate entirely
        # for common greetings/short phrases (kept as a free, instant
        # shortcut for the highest-traffic phrases).
        common_translation = self._lookup_common_translation(
            cleaned_text, source_code, target_code
        )
        if common_translation is not None:
            logger.info("Common phrase translation used (Google Translate not called)")
            return {
                "success": True,
                "translated_text": common_translation,
                "reason": None,
            }

        try:
            # Run the blocking call in its own worker thread with a hard
            # deadline. GoogleTranslator (deep-translator) makes a plain
            # `requests.get` internally with no timeout of its own, so
            # without this a stalled connection could hang indefinitely --
            # exactly what REQUEST_TIMEOUT_SECONDS previously guarded
            # against via `requests.get(..., timeout=...)`.
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(
                    self._call_google_translate, cleaned_text, source_code, target_code
                )
                translated_text = future.result(timeout=REQUEST_TIMEOUT_SECONDS)

            if not isinstance(translated_text, str) or not translated_text.strip():
                raise ValueError("Google Translate returned an empty translation")

            logger.info("Google Translate successful")
            return {
                "success": True,
                "translated_text": translated_text.strip(),
                "reason": None,
            }
        except Exception as error:
            # Translation must never interrupt a live meeting. Return source
            # text as a usable subtitle when Google Translate is unavailable.
            # This is a genuine failure of the translate call, not a normal
            # outcome -- log it loudly and with full context so Render logs
            # identify the exact cause (timeout, DNS failure, HTTP error,
            # connection error, rate limiting, invalid response, ...)
            # instead of the failure being indistinguishable from a real,
            # successful translation. Caught broadly (not just
            # requests.RequestException) because deep-translator raises its
            # own exception types (TooManyRequests, RequestError,
            # TranslationNotFound, ...) that don't all share one base class,
            # and a bare concurrent.futures.TimeoutError on a stalled call
            # needs to be caught here too.
            failed_at = datetime.now(timezone.utc).isoformat()
            logger.error(
                "Google Translate request failed: exception_type=%s exception_message=%s "
                "source_language=%s target_language=%s input_text_preview=%r timestamp=%s",
                type(error).__name__,
                str(error),
                source_code,
                target_code,
                cleaned_text[:100],
                failed_at,
            )
            print(
                "===============================\n"
                "TRANSLATION FAILED\n"
                f"Source: {source_code}\n"
                f"Target: {target_code}\n"
                f"Reason: {error}\n"
                "Falling back to original transcript.\n"
                "==============================="
            )
            return {
                "success": True,
                "translated_text": cleaned_text,
                "reason": "translation_fallback",
                "message": str(error),
            }

    @staticmethod
    def _call_google_translate(text, source_code, target_code):
        """Blocking call executed in a worker thread by translate() above."""
        return GoogleTranslator(source=source_code, target=target_code).translate(text)


translation_service = TranslationService()
