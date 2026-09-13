"""One verified language policy for LinguaSync's live meeting pipeline.

Nova-3 language availability is checked against Deepgram's public Models &
Languages Overview. MyMemory accepts ISO/RFC language-pair identifiers but
does not publish a guaranteed pair matrix, so translation failures remain
handled at runtime by ``translation_service``.
"""

SUPPORTED_LANGUAGES = {
    "English": "en",
    "Hindi": "hi",
    "Telugu": "te",
    "Tamil": "ta",
    "Kannada": "kn",
    "Bengali": "bn",
    "Marathi": "mr",
    "Gujarati": "gu",
    "Punjabi": "pa",
    "Urdu": "ur",
    "Assamese": "as",
    "Nepali": "ne",
}

UNSUPPORTED_REQUESTED_LANGUAGES = {
    "Malayalam": "Not listed for Deepgram Nova-3.",
    "Odia": "Not listed for Deepgram Nova-3.",
    "Sanskrit": "Not listed for Deepgram Nova-3.",
    "Konkani": "Not listed for Deepgram Nova-3.",
    "Sindhi": "Not listed for Deepgram Nova-3.",
    "Kashmiri": "Not listed for Deepgram Nova-3.",
    "Dogri": "Not listed for Deepgram Nova-3.",
    "Maithili": "Not listed for Deepgram Nova-3.",
}

LANGUAGE_ALIASES = {
    **{name.casefold(): code for name, code in SUPPORTED_LANGUAGES.items()},
    **{code: code for code in SUPPORTED_LANGUAGES.values()},
    "hi-in": "hi",
    "te-in": "te",
    "ta-in": "ta",
    "kn-in": "kn",
    "bn-in": "bn",
    "mr-in": "mr",
    "gu-in": "gu",
    "pa-in": "pa",
    "ur-in": "ur",
    "as-in": "as",
    "ne-np": "ne",
}


def language_code(value, default=None):
    normalized = str(value or "").strip().casefold().replace("_", "-")
    if not normalized:
        return default
    return LANGUAGE_ALIASES.get(normalized, default)


def language_name(value, default=None):
    code = language_code(value)
    if not code:
        return default
    return next((name for name, item_code in SUPPORTED_LANGUAGES.items() if item_code == code), default)
