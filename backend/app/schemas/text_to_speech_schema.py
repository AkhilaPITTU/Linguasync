from pydantic import BaseModel


class TextToSpeechSchema(BaseModel):
    text: str
    language: str