from transformers import MarianMTModel, MarianTokenizer


class TranslationService:

    def __init__(self):

        self.models = {}

    def load_model(self, source_lang, target_lang):

        model_name = f"Helsinki-NLP/opus-mt-{source_lang}-{target_lang}"

        if model_name not in self.models:

            tokenizer = MarianTokenizer.from_pretrained(model_name)

            model = MarianMTModel.from_pretrained(model_name)

            self.models[model_name] = {
                "tokenizer": tokenizer,
                "model": model
            }

        return self.models[model_name]

    def translate(self, text, source_lang="en", target_lang="es"):

        if not text.strip():

            return ""

        model_data = self.load_model(source_lang, target_lang)

        tokenizer = model_data["tokenizer"]
        model = model_data["model"]

        inputs = tokenizer(
            text,
            return_tensors="pt",
            padding=True
        )

        translated = model.generate(**inputs)

        result = tokenizer.batch_decode(
            translated,
            skip_special_tokens=True
        )

        return result[0]


translation_service = TranslationService()