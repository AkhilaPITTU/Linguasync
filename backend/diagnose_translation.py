"""Read-only diagnostic for the shared M2M100 translation service.

Run from the backend directory:
    venv\\Scripts\\python.exe diagnose_translation.py
"""

import platform
import sys
import time

from app.ai.translation_service import MODEL_NAME, LANGUAGE_CODES, translation_service


def main():
    print(f"Python: {sys.version}")
    print(f"Platform: {platform.platform()}")
    print(f"Translation model: {MODEL_NAME}")
    print(f"Supported languages: {LANGUAGE_CODES}")

    started = time.perf_counter()
    loaded, error = translation_service.load_model()
    elapsed = time.perf_counter() - started
    if not loaded:
        print(f"Model load failed after {elapsed:.2f}s: {error}")
        return 1

    print(f"Model loaded in {elapsed:.2f}s")
    for text, source, target in [
        ("Hello everyone", "English", "Telugu"),
        ("Hello everyone", "English", "Hindi"),
        ("నమస్కారం అందరికీ", "Telugu", "Hindi"),
        ("सभी को नमस्ते", "Hindi", "Telugu"),
    ]:
        result = translation_service.translate(text, source, target)
        print(f"{source} -> {target}: {result}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
