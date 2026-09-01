from threading import Lock

import torch
from transformers import M2M100ForConditionalGeneration, M2M100Tokenizer


MODEL_NAME = "facebook/m2m100_418M"

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


class TranslationService:
    """One lazy, shared M2M100 translator for English, Hindi, and Telugu."""

    def __init__(self):
        self.tokenizer = None
        self.model = None
        self._load_lock = Lock()
        # M2M100Tokenizer.src_lang is mutable, so serialization prevents one
        # request from changing another request's source language mid-encode.
        self._translation_lock = Lock()

    def get_language_code(self, language):
        if not language:
            return None

        return _LANGUAGE_ALIASES.get(str(language).strip().casefold())

    def load_model(self):
        """Load exactly one tokenizer/model pair on the first real request."""
        if self.tokenizer is not None and self.model is not None:
            return True, None

        with self._load_lock:
            if self.tokenizer is not None and self.model is not None:
                return True, None

            try:
                print(f"Loading translation model: {MODEL_NAME}")
                tokenizer = M2M100Tokenizer.from_pretrained(MODEL_NAME)
                model = M2M100ForConditionalGeneration.from_pretrained(MODEL_NAME)
                model.eval()
                self.tokenizer = tokenizer
                self.model = model
                return True, None
            except Exception as error:
                return False, str(error)

    def translate(self, text, source_lang="English", target_lang="English"):
        """Translate directly between supported M2M100 languages."""
        if not isinstance(text, str) or not text.strip():
            return {
                "success": False,
                "translated_text": None,
                "reason": "empty_text",
                "message": "Text to translate is required.",
            }

        source_code = self.get_language_code(source_lang)
        target_code = self.get_language_code(target_lang)
        if not source_code or not target_code:
            return {
                "success": False,
                "translated_text": None,
                "reason": "unsupported_language_code",
                "message": "Only English (en), Hindi (hi), and Telugu (te) are supported.",
            }

        cleaned_text = text.strip()
        if source_code == target_code:
            return {
                "success": True,
                "translated_text": cleaned_text,
                "reason": None,
            }

        loaded, load_error = self.load_model()
        if not loaded:
            return {
                "success": False,
                "translated_text": None,
                "reason": "model_unavailable",
                "message": load_error,
            }

        try:
            with self._translation_lock:
                self.tokenizer.src_lang = source_code
                encoded = self.tokenizer(
                    cleaned_text,
                    return_tensors="pt",
                    truncation=True,
                )
                with torch.no_grad():
                    generated = self.model.generate(
                        **encoded,
                        forced_bos_token_id=self.tokenizer.get_lang_id(target_code),
                    )
                translated_text = self.tokenizer.batch_decode(
                    generated,
                    skip_special_tokens=True,
                )[0].strip()

            if not translated_text:
                return {
                    "success": False,
                    "translated_text": None,
                    "reason": "empty_translation",
                    "message": "The translation model returned no text.",
                }

            return {
                "success": True,
                "translated_text": translated_text,
                "reason": None,
            }
        except Exception as error:
            return {
                "success": False,
                "translated_text": None,
                "reason": "translation_error",
                "message": str(error),
            }


translation_service = TranslationService()
