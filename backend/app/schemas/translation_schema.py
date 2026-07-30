from pydantic import BaseModel


class TranslationSchema(BaseModel):
    text: str
    source_language: str
    target_language: str