from pydantic import BaseModel


class RealtimeTranslationSchema(BaseModel):

    source_language: str

    target_language: str

    filename: str