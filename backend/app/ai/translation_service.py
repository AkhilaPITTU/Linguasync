import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from IndicTransToolkit.processor import IndicProcessor


# Direct source -> target translation for every supported pair, without
# pivoting through English, requires three directional IndicTrans2
# checkpoints instead of a single one: English -> Indic, Indic -> English,
# and Indic <-> Indic. Each is loaded once, the first time that direction
# is actually needed, and then reused for every later request in that
# direction (never one instance per user and never one per language pair).
EN_INDIC_MODEL_NAME = "ai4bharat/indictrans2-en-indic-dist-200M"
INDIC_EN_MODEL_NAME = "ai4bharat/indictrans2-indic-en-dist-200M"
INDIC_INDIC_MODEL_NAME = "ai4bharat/indictrans2-indic-indic-dist-320M"

ENGLISH_FLORES_CODE = "eng_Latn"

# LinguaSync now targets exactly these 12 languages. Every code below is
# the FLORES-200 / IndicTrans2 code, verified against IndicTrans2's own
# published language list (ai4bharat/indictrans2-*) before this change --
# all 12, including Odia (ory_Orya), are directly supported.
LANGUAGE_CONFIG = {
    "English": {"code": "en", "flores_code": "eng_Latn"},
    "Telugu": {"code": "te", "flores_code": "tel_Telu"},
    "Hindi": {"code": "hi", "flores_code": "hin_Deva"},
    "Tamil": {"code": "ta", "flores_code": "tam_Taml"},
    "Kannada": {"code": "kn", "flores_code": "kan_Knda"},
    "Malayalam": {"code": "ml", "flores_code": "mal_Mlym"},
    "Bengali": {"code": "bn", "flores_code": "ben_Beng"},
    "Marathi": {"code": "mr", "flores_code": "mar_Deva"},
    "Gujarati": {"code": "gu", "flores_code": "guj_Gujr"},
    "Punjabi": {"code": "pa", "flores_code": "pan_Guru"},
    "Urdu": {"code": "ur", "flores_code": "urd_Arab"},
    "Odia": {"code": "or", "flores_code": "ory_Orya"},
}

LANGUAGE_CODES = {
    language: config["code"]
    for language, config in LANGUAGE_CONFIG.items()
}

# Every language configured above is now IndicTrans2-supported (the
# non-Indic languages that previously required this filter have been
# removed from LANGUAGE_CONFIG entirely), so the token map can be built
# directly from it without a separate supported-languages filter.
INDICTRANS2_LANGUAGE_TOKENS = {
    config["code"]: config["flores_code"]
    for config in LANGUAGE_CONFIG.values()
}


class TranslationService:

    def __init__(self):

        self.models = {}

        self.processor = None

        self.language_codes = LANGUAGE_CODES

    def get_language_code(self, language):

        if not language:
            return None

        normalized_language = str(language).strip()

        if len(normalized_language) == 2:
            return normalized_language.lower()

        # Meeting records are normally stored with display names such as
        # "Telugu", but normalize casing/whitespace so a valid preference
        # cannot be routed through an unrelated fallback language.
        for language_name, config in LANGUAGE_CONFIG.items():
            if language_name.casefold() == normalized_language.casefold():
                return config["code"]

        return self.language_codes.get(normalized_language)

    def _select_model_name(self, source_flores_code, target_flores_code):

        # Route to whichever directional checkpoint actually covers this
        # pair directly -- English is never used as an intermediate step,
        # it is simply one side of the two English-facing checkpoints.
        if source_flores_code == ENGLISH_FLORES_CODE:
            return EN_INDIC_MODEL_NAME

        if target_flores_code == ENGLISH_FLORES_CODE:
            return INDIC_EN_MODEL_NAME

        return INDIC_INDIC_MODEL_NAME

    def _get_processor(self):

        if self.processor is None:
            self.processor = IndicProcessor(inference=True)

        return self.processor

    def load_model(self, model_name):

        if model_name not in self.models:

            print(f"Loading translation model: {model_name}")

            try:
                tokenizer = AutoTokenizer.from_pretrained(
                    model_name, trust_remote_code=True
                )
                model = AutoModelForSeq2SeqLM.from_pretrained(
                    model_name, trust_remote_code=True
                )

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
            source_code not in INDICTRANS2_LANGUAGE_TOKENS or
            target_code not in INDICTRANS2_LANGUAGE_TOKENS
        ):
            return {
                "success": False,
                "reason": "unsupported_language_pair",
                "translated_text": None,
            }

        source_flores_code = INDICTRANS2_LANGUAGE_TOKENS[source_code]
        target_flores_code = INDICTRANS2_LANGUAGE_TOKENS[target_code]

        model_name = self._select_model_name(source_flores_code, target_flores_code)

        model_data, load_error = self.load_model(model_name)

        if model_data is None:
            return {
                "success": False,
                "reason": "model_unavailable",
                "message": load_error,
                "translated_text": None,
            }

        try:
            tokenizer = model_data["tokenizer"]
            model = model_data["model"]
            processor = self._get_processor()

            preprocessed = processor.preprocess_batch(
                [text.strip()],
                src_lang=source_flores_code,
                tgt_lang=target_flores_code,
            )

            inputs = tokenizer(
                preprocessed,
                return_tensors="pt",
                padding="longest",
                truncation=True,
            )

            with torch.no_grad():
                generated = model.generate(
                    **inputs,
                    max_length=256,
                    num_beams=5,
                )

            decoded = tokenizer.batch_decode(
                generated,
                skip_special_tokens=True,
                clean_up_tokenization_spaces=True,
            )

            translated_text = processor.postprocess_batch(
                decoded, lang=target_flores_code
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
