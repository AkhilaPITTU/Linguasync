from transformers import MarianMTModel, MarianTokenizer


class TranslationService:

    def __init__(self):

        self.models = {}

        # Language name -> MarianMT language code
        self.language_codes = {
            "English": "en",
            "Hindi": "hi",
            "Telugu": "te",
            "Tamil": "ta",
            "Kannada": "kn",
            "Malayalam": "ml",
            "Bengali": "bn",
            "Marathi": "mr",
            "Gujarati": "gu",
            "Punjabi": "pa",
            "Urdu": "ur",
            "Spanish": "es",
            "French": "fr",
            "German": "de",
            "Italian": "it",
            "Portuguese": "pt",
            "Russian": "ru",
            "Chinese": "zh",
            "Japanese": "ja",
            "Korean": "ko"
        }

    # ==========================================
    # Convert language name to MarianMT code
    # ==========================================

    def get_language_code(self, language):

        if not language:
            return "en"

        # Already a language code
        if len(language) == 2:
            return language.lower()

        return self.language_codes.get(language, "en")

    # ==========================================
    # Load Translation Model
    # ==========================================

    def load_model(self, source_lang, target_lang):

        source_lang = self.get_language_code(source_lang)
        target_lang = self.get_language_code(target_lang)

        if source_lang == target_lang:
            return None

        model_name = f"Helsinki-NLP/opus-mt-{source_lang}-{target_lang}"

        if model_name not in self.models:

            print(f"Loading Translation Model: {model_name}")

            try:

                tokenizer = MarianTokenizer.from_pretrained(model_name)

                model = MarianMTModel.from_pretrained(model_name)

                self.models[model_name] = {
                    "tokenizer": tokenizer,
                    "model": model
                }

            except Exception as e:

                print(f"Unable to load translation model {model_name}")
                print(e)

                return None

        return self.models[model_name]

    # ==========================================
    # Translate Text
    # ==========================================

    def translate(
        self,
        text,
        source_lang="English",
        target_lang="Spanish"
    ):

        if not text:
            return ""

        text = text.strip()

        if not text:
            return ""

        source_lang = self.get_language_code(source_lang)
        target_lang = self.get_language_code(target_lang)

        # No translation required
        if source_lang == target_lang:
            return text

        model_data = self.load_model(
            source_lang,
            target_lang
        )

        if model_data is None:
            return text

        tokenizer = model_data["tokenizer"]
        model = model_data["model"]

        try:

            inputs = tokenizer(
                text,
                return_tensors="pt",
                padding=True,
                truncation=True
            )

            translated = model.generate(**inputs)

            result = tokenizer.batch_decode(
                translated,
                skip_special_tokens=True
            )

            return result[0]

        except Exception as e:

            print("Translation Error:", e)

            return text


translation_service = TranslationService()