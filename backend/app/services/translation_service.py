from functools import lru_cache
from transformers import MarianMTModel, MarianTokenizer

LANGUAGE_CODES = {
    "english": "en",
    "en": "en",

    "hindi": "hi",
    "hi": "hi",

    "telugu": "te",
    "te": "te",

    "french": "fr",
    "fr": "fr",

    "spanish": "es",
    "es": "es",

    "german": "de",
    "de": "de",
}

MODEL_MAP = {
    ("en", "hi"): "Helsinki-NLP/opus-mt-en-hi",
    ("hi", "en"): "Helsinki-NLP/opus-mt-hi-en",

    ("en", "fr"): "Helsinki-NLP/opus-mt-en-fr",
    ("fr", "en"): "Helsinki-NLP/opus-mt-fr-en",

    ("en", "es"): "Helsinki-NLP/opus-mt-en-es",
    ("es", "en"): "Helsinki-NLP/opus-mt-es-en",

    ("en", "de"): "Helsinki-NLP/opus-mt-en-de",
    ("de", "en"): "Helsinki-NLP/opus-mt-de-en",
}


@lru_cache(maxsize=10)
def load_model(model_name):
    tokenizer = MarianTokenizer.from_pretrained(model_name)
    model = MarianMTModel.from_pretrained(model_name)
    return tokenizer, model


async def translate_text(
    text,
    source_language,
    target_language
):

    source_language = LANGUAGE_CODES.get(
        source_language.lower(),
        source_language.lower()
    )

    target_language = LANGUAGE_CODES.get(
        target_language.lower(),
        target_language.lower()
    )

    if source_language == target_language:
        return {
            "success": True,
            "translated_text": text,
            "source_language": source_language,
            "target_language": target_language,
            "original_text": text,
        }

    model_name = MODEL_MAP.get(
        (source_language, target_language)
    )

    if model_name is None:
        return {
            "success": False,
            "message": f"Unsupported language pair: {source_language} -> {target_language}"
        }

    tokenizer, model = load_model(model_name)

    encoded = tokenizer(
        text,
        return_tensors="pt",
        padding=True,
        truncation=True,
    )

    translated = model.generate(**encoded)

    translated_text = tokenizer.decode(
        translated[0],
        skip_special_tokens=True,
    )

    return {
        "success": True,
        "original_text": text,
        "translated_text": translated_text,
        "source_language": source_language,
        "target_language": target_language,
    }