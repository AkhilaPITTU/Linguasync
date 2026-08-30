"""
STANDALONE, READ-ONLY diagnostic script for the LinguaSync translation
pipeline. This file is NOT part of the application and modifies NOTHING --
it only imports the real, unmodified backend.app.ai.translation_service
module and calls it directly, plus makes a couple of independent
from_pretrained() calls to recover the full tracebacks that
translation_service.py's own exception handlers currently discard.

HOW TO RUN (on the real Windows machine, in the real project venv):

    cd backend
    venv\\Scripts\\python.exe ..\\diagnose_translation.py

(adjust the relative path to wherever this file is saved; it does not need
to live inside the project folder -- it only needs `backend` importable,
which the sys.path.insert below handles as long as you run it from the
`backend` directory, or edit BACKEND_DIR below to an absolute path).

Prints every piece of evidence requested in Steps 3, 5, 6, and 9 of the
investigation: model/tokenizer classes, load status, HF cache locations,
device, full unswallowed tracebacks on failure, real translate() calls for
the 4 required language pairs with timing, and a full environment/version
report. Nothing here touches the database, the FastAPI app, or any
websocket -- it only exercises the translation model in isolation.
"""
import os
import platform
import sys
import time
import traceback

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(BACKEND_DIR) != "backend":
    # If this file was saved next to backend/ instead of inside the repo,
    # try backend/ as a sibling directory too.
    candidate = os.path.join(BACKEND_DIR, "backend")
    if os.path.isdir(candidate):
        BACKEND_DIR = candidate
sys.path.insert(0, BACKEND_DIR)

SEP = "=" * 70


def section(title):
    print("\n" + SEP)
    print(title)
    print(SEP)


# ---------------------------------------------------------------------
# STEP 9: runtime environment
# ---------------------------------------------------------------------
section("STEP 9: RUNTIME ENVIRONMENT")
print(f"Python version: {sys.version}")
print(f"Platform: {platform.platform()}")

for pkg in [
    "torch", "transformers", "sentencepiece", "IndicTransToolkit",
    "faster_whisper", "ctranslate2", "huggingface_hub",
]:
    try:
        mod = __import__(pkg)
        version = getattr(mod, "__version__", "unknown")
        print(f"{pkg}: {version} (import OK, from {getattr(mod, '__file__', '?')})")
    except Exception as import_error:
        print(f"{pkg}: IMPORT FAILED -> {type(import_error).__name__}: {import_error}")

try:
    import torch
    print(f"torch.cuda.is_available(): {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU name: {torch.cuda.get_device_name(0)}")
    else:
        print("GPU name: n/a (CUDA not available -- model will run on CPU)")
except Exception as error:
    print(f"Could not check CUDA: {error}")

print("\n--- requirements.txt vs installed (only packages listed above) ---")
req_path = os.path.join(os.path.dirname(BACKEND_DIR), "backend", "requirements.txt")
if not os.path.isfile(req_path):
    req_path = os.path.join(BACKEND_DIR, "requirements.txt")
try:
    with open(req_path, "r", encoding="utf-16") as f:
        req_lines = f.read().splitlines()
except Exception:
    try:
        with open(req_path, "r", encoding="utf-8") as f:
            req_lines = f.read().splitlines()
    except Exception as error:
        req_lines = []
        print(f"Could not read requirements.txt: {error}")
req_pins = {}
for line in req_lines:
    line = line.strip().lstrip("﻿")
    if "==" in line:
        name, _, ver = line.partition("==")
        req_pins[name.strip().lower()] = ver.strip()
for pkg in ["torch", "transformers", "sentencepiece", "IndicTransToolkit", "faster-whisper", "ctranslate2"]:
    pinned = req_pins.get(pkg.lower())
    print(f"requirements.txt pins {pkg} == {pinned!r}")

# ---------------------------------------------------------------------
# Network reachability to huggingface.co, checked directly from THIS
# process/machine (not from any sandboxed shell) -- the only way to know
# whether the real application's own environment can actually reach it.
# ---------------------------------------------------------------------
section("NETWORK: can THIS machine/process reach huggingface.co?")
try:
    import requests
    start = time.time()
    try:
        resp = requests.head("https://huggingface.co", timeout=10)
        print(f"HEAD https://huggingface.co -> HTTP {resp.status_code} in {time.time()-start:.2f}s")
    except Exception as error:
        print(f"HEAD https://huggingface.co -> FAILED after {time.time()-start:.2f}s: "
              f"{type(error).__name__}: {error}")
except Exception as error:
    print(f"Could not even import requests: {error}")

# Where does huggingface_hub think its cache lives, and does it already
# contain these three model repos (i.e. was a previous successful download
# ever completed on this machine)?
section("STEP 3 (part 1): HuggingFace cache location + existing contents")
try:
    from huggingface_hub import constants as hf_constants
    cache_dir = getattr(hf_constants, "HF_HUB_CACHE", None) or getattr(hf_constants, "HUGGINGFACE_HUB_CACHE", None)
    print(f"Resolved HF cache dir: {cache_dir}")
    print(f"HF_HOME env: {os.environ.get('HF_HOME')!r}")
    print(f"TRANSFORMERS_CACHE env: {os.environ.get('TRANSFORMERS_CACHE')!r}")
    print(f"HUGGINGFACE_HUB_CACHE env: {os.environ.get('HUGGINGFACE_HUB_CACHE')!r}")
    print(f"HF_HUB_OFFLINE env: {os.environ.get('HF_HUB_OFFLINE')!r}")
    if cache_dir and os.path.isdir(cache_dir):
        entries = sorted(os.listdir(cache_dir))
        print(f"Cache dir exists. Entries ({len(entries)} total):")
        for entry in entries:
            if "indictrans2" in entry.lower():
                print(f"  -> {entry}  <-- matches an IndicTrans2 model")
            else:
                print(f"     {entry}")
    else:
        print("Cache dir does not exist on disk yet (no model has ever been fully cached here).")
except Exception as error:
    print(f"Could not inspect HF cache: {type(error).__name__}: {error}")
    traceback.print_exc()

# ---------------------------------------------------------------------
# Import the REAL translation_service module, unmodified.
# ---------------------------------------------------------------------
section("Importing the REAL backend.app.ai.translation_service (unmodified)")
try:
    from app.ai.translation_service import (
        translation_service,
        EN_INDIC_MODEL_NAME,
        INDIC_EN_MODEL_NAME,
        INDIC_INDIC_MODEL_NAME,
        LANGUAGE_CONFIG,
    )
    print("Import succeeded.")
    print(f"EN_INDIC_MODEL_NAME  = {EN_INDIC_MODEL_NAME}")
    print(f"INDIC_EN_MODEL_NAME  = {INDIC_EN_MODEL_NAME}")
    print(f"INDIC_INDIC_MODEL_NAME = {INDIC_INDIC_MODEL_NAME}")
except Exception:
    print("IMPORT OF translation_service.py ITSELF FAILED. Full traceback:")
    traceback.print_exc()
    sys.exit(1)

# ---------------------------------------------------------------------
# STEP 3: is the model actually loaded? Try each of the 3 directional
# checkpoints via the REAL translation_service.load_model(), which is
# exactly what the live app calls. Its own except-block only returns a
# bare string, so we ALSO retry the from_pretrained() calls ourselves,
# directly, with a full unswallowed traceback if either fails.
# ---------------------------------------------------------------------
section("STEP 3: MODEL / TOKENIZER LOADING (via the real translation_service.load_model)")
for model_name in [EN_INDIC_MODEL_NAME, INDIC_EN_MODEL_NAME, INDIC_INDIC_MODEL_NAME]:
    print(f"\n--- {model_name} ---")
    started = time.time()
    model_data, load_error = translation_service.load_model(model_name)
    elapsed = time.time() - started
    if model_data is None:
        print(f"load_model() FAILED in {elapsed:.2f}s. "
              f"translation_service's own captured message (str(error) only, no traceback):")
        print(f"  {load_error!r}")
    else:
        tokenizer = model_data["tokenizer"]
        model = model_data["model"]
        print(f"load_model() SUCCEEDED in {elapsed:.2f}s")
        print(f"  tokenizer class: {type(tokenizer).__module__}.{type(tokenizer).__name__}")
        print(f"  model class:     {type(model).__module__}.{type(model).__name__}")
        try:
            device = next(model.parameters()).device
            print(f"  model device: {device}")
        except Exception as error:
            print(f"  could not determine model device: {error}")

section("STEP 3 (part 2): full unswallowed traceback for each checkpoint, if any fail")
import torch as _torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

for model_name in [EN_INDIC_MODEL_NAME, INDIC_EN_MODEL_NAME, INDIC_INDIC_MODEL_NAME]:
    print(f"\n--- direct from_pretrained() retry for {model_name} (bypassing translation_service's cache) ---")
    try:
        started = time.time()
        tok = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
        print(f"  AutoTokenizer.from_pretrained OK in {time.time()-started:.2f}s -> {type(tok).__name__}")
    except Exception:
        print("  AutoTokenizer.from_pretrained RAISED. FULL TRACEBACK (not summarized):")
        traceback.print_exc()
        continue
    try:
        started = time.time()
        mdl = AutoModelForSeq2SeqLM.from_pretrained(model_name, trust_remote_code=True)
        print(f"  AutoModelForSeq2SeqLM.from_pretrained OK in {time.time()-started:.2f}s -> {type(mdl).__name__}")
    except Exception:
        print("  AutoModelForSeq2SeqLM.from_pretrained RAISED. FULL TRACEBACK (not summarized):")
        traceback.print_exc()

# ---------------------------------------------------------------------
# STEP 5: real translations, not mocked, exactly the 4 required pairs.
# ---------------------------------------------------------------------
section("STEP 5: REAL translate() calls (the exact function meeting_socket.py calls)")
test_cases = [
    ("Hello everyone", "English", "Telugu"),
    ("Hello everyone", "English", "Hindi"),
    ("హలో అందరూ" if False else "Hello everyone translated to Telugu placeholder", "Telugu", "English"),
    ("Hello everyone translated to Hindi placeholder", "Hindi", "English"),
]
# Use plausible real strings for the reverse direction instead of placeholders:
test_cases = [
    ("Hello everyone", "English", "Telugu"),
    ("Hello everyone", "English", "Hindi"),
    ("నమస్కారం అందరికీ", "Telugu", "English"),
    ("सभी को नमस्ते", "Hindi", "English"),
]

for text, source_lang, target_lang in test_cases:
    print(f"\n--- INPUT: {text!r}  {source_lang} -> {target_lang} ---")
    started = time.time()
    try:
        result = translation_service.translate(text, source_lang=source_lang, target_lang=target_lang)
        elapsed = time.time() - started
        print(f"  execution_time: {elapsed:.3f}s")
        print(f"  success: {result.get('success')}")
        print(f"  reason: {result.get('reason')}")
        print(f"  message (the part meeting_socket.py never prints): {result.get('message')!r}")
        print(f"  translated_text: {result.get('translated_text')!r}")
    except Exception:
        elapsed = time.time() - started
        print(f"  translate() ITSELF RAISED after {elapsed:.2f}s (should not happen -- it has a try/except -- "
              f"but printing the full traceback in case something above it fails):")
        traceback.print_exc()

section("DONE. Please paste this ENTIRE output back, unedited.")
