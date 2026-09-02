"""Read-only diagnostic for the LibreTranslate-backed translation service.

Run from the backend directory:
    venv\\Scripts\\python.exe diagnose_translation.py
"""

from app.ai.translation_service import LANGUAGE_CODES, translation_service


def main():
    print(f"Supported languages: {LANGUAGE_CODES}")
    for text, source, target in [
        ("Hello everyone", "English", "Telugu"),
        ("Hello everyone", "English", "Hindi"),
        ("నమస్కారం అందరికీ", "Telugu", "Hindi"),
        ("सभी को नमस्ते", "Hindi", "Telugu"),
    ]:
        print(f"{source} -> {target}: {translation_service.translate(text, source, target)}")


if __name__ == "__main__":
    main()
