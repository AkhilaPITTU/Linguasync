from app.ai.translation_service import translation_service

result = translation_service.translate(
    "Welcome to LinguaSync",
    source_lang="en",
    target_lang="es"
)

print(result)