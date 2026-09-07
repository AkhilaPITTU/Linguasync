"""Manual smoke test for the MyMemory-backed TranslationService.

Run from the backend directory:
    python test_translation.py
    (or) venv\\Scripts\\python.exe test_translation.py

Exercises every combination of English, Hindi, and Telugu and prints the
full result dict returned by TranslationService.translate() for each pair.
"""

from app.ai.translation_service import translation_service

TEST_CASES = [
    ("Hello, how are you?", "English", "Hindi"),
    ("नमस्ते, आप कैसे हैं?", "Hindi", "English"),
    ("Hello, how are you?", "English", "Telugu"),
    ("నమస్కారం, మీరు ఎలా ఉన్నారు?", "Telugu", "English"),
    ("नमस्ते, आप कैसे हैं?", "Hindi", "Telugu"),
    ("నమస్కారం, మీరు ఎలా ఉన్నారు?", "Telugu", "Hindi"),
]


def main():
    for text, source, target in TEST_CASES:
        result = translation_service.translate(text, source_lang=source, target_lang=target)
        print(f"{source} -> {target}")
        print(f"  input : {text}")
        print(f"  result: {result}")
        print()


if __name__ == "__main__":
    main()
