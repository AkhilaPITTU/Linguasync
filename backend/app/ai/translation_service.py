from transformers import AutoModelForSeq2SeqLM, AutoTokenizer


# One multilingual model is used for every supported source -> target pair.
NLLB_MODEL_NAME = "facebook/nllb-200-distilled-600M"

LANGUAGE_CONFIG = {
    "English": {"code": "en", "nllb_code": "eng_Latn"},
    "Telugu": {"code": "te", "nllb_code": "tel_Telu"},
    "Hindi": {"code": "hi", "nllb_code": "hin_Deva"},
    "Tamil": {"code": "ta", "nllb_code": "tam_Taml"},
    "Kannada": {"code": "kn", "nllb_code": "kan_Knda"},
    "Malayalam": {"code": "ml", "nllb_code": "mal_Mlym"},
    "Bengali": {"code": "bn", "nllb_code": "ben_Beng"},
    "Marathi": {"code": "mr", "nllb_code": "mar_Deva"},
    "Gujarati": {"code": "gu", "nllb_code": "guj_Gujr"},
    "Punjabi": {"code": "pa", "nllb_code": "pan_Guru"},
    "Urdu": {"code": "ur", "nllb_code": "urd_Arab"},
    "Spanish": {"code": "es", "nllb_code": "spa_Latn"},
    "French": {"code": "fr", "nllb_code": "fra_Latn"},
    "German": {"code": "de", "nllb_code": "deu_Latn"},
    "Italian": {"code": "it", "nllb_code": "ita_Latn"},
    "Portuguese": {"code": "pt", "nllb_code": "por_Latn"},
    "Russian": {"code": "ru", "nllb_code": "rus_Cyrl"},
    "Chinese": {"code": "zh", "nllb_code": "zho_Hans"},
    "Japanese": {"code": "ja", "nllb_code": "jpn_Jpan"},
    "Korean": {"code": "ko", "nllb_code": "kor_Hang"},
}

LANGUAGE_CODES = {
    language: config["code"]
    for language, config in LANGUAGE_CONFIG.items()
}

NLLB_LANGUAGE_TOKENS = {
    config["code"]: config["nllb_code"]
    for config in LANGUAGE_CONFIG.values()
}


class TranslationService:

    def __init__(self):

        self.models = {}

        self.language_codes = LANGUAGE_CODES

    def get_language_code(self, language):

        if not language:
            return None

        if len(language) == 2:
            return language.lower()

        return self.language_codes.get(language)

    def load_model(self):

        model_name = NLLB_MODEL_NAME

        if model_name not in self.models:

            print(f"Loading translation model: {model_name}")

            try:
                tokenizer = AutoTokenizer.from_pretrained(model_name)
                model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

                self.models[model_name] = {
                    "tokenizer": tokenizer,
                    "model": model,
                }

            except Exception as error:
                return None, str(error)

        return self.models[model_name], None

    def translate(
        self,
        text,
        source_lang="English",
        target_lang="Spanish",
    ):
        """Return either a verified translation or a structured failure."""

        if not isinstance(text, str) or not text.strip():
            return {
                "success": False,
                "reason": "empty_text",
                "translated_text": None,
            }

        source_code = self.get_language_code(source_lang)
        target_code = self.get_language_code(target_lang)

        if not source_code or not target_code:
            return {
                "success": False,
                "reason": "unsupported_language_code",
                "translated_text": None,
            }

        if source_code == target_code:
            return {
                "success": True,
                "reason": "translation_not_required",
                "translated_text": text.strip(),
            }

        if (
            source_code not in NLLB_LANGUAGE_TOKENS or
            target_code not in NLLB_LANGUAGE_TOKENS
        ):
            return {
                "success": False,
                "reason": "unsupported_language_pair",
                "translated_text": None,
            }

        model_data, load_error = self.load_model()

        if model_data is None:
            return {
                "success": False,
                "reason": "model_unavailable",
                "message": load_error,
                "translated_text": None,
            }

        try:
            tokenizer = model_data["tokenizer"]
            tokenizer.src_lang = NLLB_LANGUAGE_TOKENS[source_code]

            inputs = tokenizer(
                text.strip(),
                return_tensors="pt",
                padding=True,
                truncation=True,
            )

            target_token_id = tokenizer.convert_tokens_to_ids(
                NLLB_LANGUAGE_TOKENS[target_code]
            )

            translated = model_data["model"].generate(
                **inputs,
                forced_bos_token_id=target_token_id,
            )

            translated_text = tokenizer.batch_decode(
                translated,
                skip_special_tokens=True,
            )[0].strip()

            if not translated_text:
                return {
                    "success": False,
                    "reason": "empty_translation",
                    "translated_text": None,
                }

            return {
                "success": True,
                "reason": None,
                "translated_text": translated_text,
            }

        except Exception as error:
            return {
                "success": False,
                "reason": "translation_error",
                "message": str(error),
                "translated_text": None,
            }


translation_service = TranslationService()
