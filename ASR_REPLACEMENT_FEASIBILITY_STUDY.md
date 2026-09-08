# ASR Replacement Feasibility Study — Linguasync

**Scope:** Technical feasibility study only. No code was modified. All findings are based on a direct read of the current `backend/` codebase plus current documentation for each candidate model.

---

## 1. Current Architecture (as found in code)

| Concern | Location | What it does |
|---|---|---|
| Model loading | `backend/app/ai/whisper_service.py` → `WhisperService.get_model()` | Lazy-loaded singleton: `WhisperModel("base", device="cpu", compute_type="int8")` from `faster-whisper==1.2.1` (CTranslate2 backend, no PyTorch dependency). Loaded once at first use, never released. |
| Transcription call (realtime) | `whisper_service.transcribe(audio, vad_filter, language)` | Accepts either raw bytes (`.webm`, written to a temp file) or a `float32` NumPy array (the realtime path). Forces `language=<configured>` (auto-detect is explicitly refused if language is missing — good, this matters for the recommendation below). Calls `model.transcribe(..., task="transcribe", beam_size=5, temperature=0.0, vad_filter=vad_filter, condition_on_previous_text=False, language=language)`. |
| Transcription call (file upload) | `backend/app/services/speech_to_text_service.py` | Separate `/api/speech/transcribe` endpoint. Shares the same `whisper_service.get_model()` singleton, but calls `model.transcribe(audio_path, beam_size=5, vad_filter=True)` directly with **no forced language** (auto-detect). |
| Audio preprocessing | `backend/app/services/noise_detection_service.py` | Decodes the browser's WebM/Opus chunk with PyAV, resamples to **mono float32 PCM @ 16 kHz** via `av.AudioResampler`, computes RMS/quality/silence metrics, and hands back the already-decoded `pcm_samples` NumPy array. This is the array that goes straight into Whisper — there is no second decode. |
| WebSocket flow | `backend/app/websocket/meeting_socket.py` (`audio_stream` handler) | Browser → WS chunk → per-connection `asyncio.Queue` (bounded, drops oldest under backpressure) → worker pulls chunk → `noise_detection_service.analyze()` (in a thread) → `whisper_service.transcribe()` (in a thread, via `asyncio.to_thread`) → text handed to translation → `connection_manager` broadcasts `transcript`/translated payloads to participants → Mongo write. |
| Returned transcription format | `whisper_service.transcribe()` return value | `{"success": bool, "language": str, "text": str, "confidence": float, "segments": [{"start","end","text","confidence","avg_logprob","no_speech_prob","compression_ratio"}]}`. `confidence` is derived from `avg_logprob` (Whisper-specific signal). Downstream, `confidence_service.py` and `speech_accuracy_service.py` only consume the final float `confidence`/`text`, not the raw segment fields — the raw fields are only used for debug logging in `meeting_socket.py`. |
| Translation pipeline | `backend/app/ai/translation_service.py` | Calls the public **MyMemory** REST API (`requests`), with a small local dictionary for common short phrases. Fully decoupled from Whisper — it only receives the plain transcript string + language codes. |

**Key architectural fact that shapes every recommendation below:** the realtime path never uses Whisper's language auto-detection — the participant's selected language is always resolved and forced before the call. This means a *per-language model* strategy (different acoustic model per language) fits the existing code with no new branching logic needed elsewhere; the branching can live entirely inside `whisper_service.py`.

**Deployment constraint:** `render.yaml` deploys to Render with no GPU and a comment in `requirements.txt`/`speech_to_text_service.py` explicitly documents that duplicate eager model loads previously caused an **out-of-memory crash** on Render — which is why the app now lazy-loads a single shared model. This confirms the instance has a hard, fairly tight RAM ceiling, so any replacement has to be judged on real resident memory, not just "smaller than Whisper Small."

Also worth noting: because `faster-whisper` runs on **CTranslate2**, not PyTorch, the current stack carries **no `torch` dependency at all**. This is a meaningful, easy-to-lose advantage — several alternative models pull in `torch`/`torchaudio`, which alone typically adds several hundred MB of resident memory before a single audio sample is processed.

---

## 2. Candidate Models

### 2.1 SenseVoice-Small (FunAudioLLM / Alibaba)

- **Multilingual support:** Mandarin, Cantonese, English, Japanese, Korean (trained on 50+ languages overall, but only these five are officially supported for ASR output).
- **Telugu quality:** ❌ Not supported — no Telugu in the training/target language set.
- **Hindi quality:** ❌ Not supported — no Hindi in the training/target language set.
- **English quality:** Reported as strong, roughly on par with Whisper-large-class models for English on public benchmarks.
- **CPU performance:** Very fast — vendor claims ~70ms to process 10s of audio, "5x faster than Whisper-Small, 15x faster than Whisper-Large."
- **Memory usage:** Comparable parameter count to Whisper-Small (~230–240M params); typically run via `funasr` (PyTorch) or exported to ONNX for `sherpa-onnx` (torch-free).
- **Streaming support:** No native streaming — it's an offline (chunk-at-a-time) encoder, same processing model as current Whisper usage.
- **Python API maturity:** Mature (`funasr` package, official HF model card, active GitHub).
- **Deployment complexity:** Medium if run via `funasr`+PyTorch (heavy dependency); Low-Medium via `sherpa-onnx` ONNX export (lighter, but community-maintained conversion).
- **Verdict: disqualified** — it cannot recognize Telugu or Hindi at all, which is the entire problem being solved.

### 2.2 Moonshine (Useful Sensors)

- **Multilingual support:** English only. Moonshine v2 (the current generation, including `moonshine-streaming-tiny`/`moonshine-streaming-medium`) is still an English-focused streaming encoder; no Hindi/Telugu training data or checkpoints exist.
- **Telugu / Hindi quality:** ❌ Not supported.
- **English quality:** Excellent for its size — designed specifically to beat Whisper-tiny/base on English at a fraction of the compute, with genuinely low-latency streaming (not chunked pseudo-streaming).
- **CPU performance:** Best-in-class for its size class; this is Moonshine's whole reason for existing (edge/CPU-first design, no attention-window padding waste like Whisper).
- **Memory usage:** Very low — tiny variant ~27M params, base ~61M params, no PyTorch required in the lightweight runtime.
- **Streaming support:** Yes — genuine low-latency incremental streaming, unlike Whisper's chunk-and-reprocess approach.
- **Python API maturity:** Younger project than Whisper/faster-whisper; API is simple but has changed across versions (v1 → v2), smaller community.
- **Deployment complexity:** Low, if it fit the language requirement.
- **Verdict: disqualified** — no Hindi/Telugu support. Worth revisiting only if the product ever splits into a dedicated low-latency English-only lane, or if Useful Sensors ships Indic-language checkpoints in the future.

### 2.3 Sherpa-ONNX (k2-fsa)

Sherpa-ONNX is a **runtime**, not a single model — it's an ONNXRuntime-based inference engine (C++ core, Python/12-language bindings, no PyTorch dependency) that can host many different acoustic models: streaming Zipformer, Paraformer, NeMo Conformer/Canary, Whisper (as an offline/non-streaming ONNX export), and — most relevant here — **Dolphin**, a CTC-based multilingual model that explicitly covers Hindi and Telugu.

Evaluated as "sherpa-onnx running the Dolphin-base CTC multilingual model" (`csukuangfj/sherpa-onnx-dolphin-base-ctc-multi-lang-int8-2025-04-02`, an ONNX/int8 export of `DataoceanAI/dolphin-base`):

- **Multilingual support:** Dolphin covers 40 Eastern languages (East Asia, South Asia, Southeast Asia, Middle East) plus 22 Chinese dialects. Hindi (`hi`) and Telugu (`te`) are both explicitly listed. **English is not in Dolphin's language list** — it's an Eastern-languages model by design.
- **Telugu quality:** Meaningfully better than Whisper-base at the same/lower parameter count, per the Dolphin paper's benchmarks against Whisper on Eastern languages — see accuracy section below.
- **Hindi quality:** Same paper reports Dolphin-base at **29.9% WER vs. Whisper-base at 105.4% WER** on their internal Hindi test set (Dataocean AI benchmark) — i.e., Whisper-base is effectively non-functional on that set while Dolphin-base is usably accurate. Independently, this lines up with the real-world complaint driving this study (Whisper-base struggling badly on Hindi/Telugu).
- **English quality:** Not applicable — would need to keep the existing Whisper path (or another model) for English.
- **CPU performance:** CTC decoding (single forward pass, no autoregressive beam search) is generally lighter and faster on CPU than Whisper's decoder loop, and ONNXRuntime int8 execution is well optimized for x86 CPUs.
- **Memory usage:** Dolphin-base has ~140M parameters; the published int8 ONNX export should sit in roughly the same order of magnitude as (likely somewhat smaller runtime footprint than) the current Whisper-base int8 model, and well under Whisper-Small. No PyTorch dependency — `sherpa-onnx` + `onnxruntime` only.
- **Streaming support:** Dolphin itself is not described as streaming in its paper (offline CTC/attention hybrid), but sherpa-onnx's chunk-based offline recognizer is functionally equivalent to how this app already processes audio (short chunks through a queue) — no true incremental streaming is gained or lost here.
- **Python API maturity:** `sherpa-onnx` is a mature, actively maintained project (broad platform/language support, real production users), but the Dolphin ONNX export specifically is community-contributed (`csukuangfj`), not an official k2-fsa/Dataocean release — worth pinning a specific commit and validating accuracy yourself before relying on it in production.
- **Deployment complexity:** Medium. New dependency (`sherpa-onnx`, no torch), a different model-loading API (`sherpa_onnx.OfflineRecognizer` factory instead of `WhisperModel`), and a different raw result object (no `avg_logprob`/`no_speech_prob`/`compression_ratio` — confidence would need to be re-derived, e.g. from CTC output probabilities or dropped in favor of the existing audio-quality/heuristic-based scoring that `confidence_service.py`/`speech_accuracy_service.py` already blend in).
- **Verdict:** the strongest **true replacement** candidate for Hindi/Telugu accuracy specifically, at acceptable memory cost — but it only covers 2 of the 3 languages, so English must stay on a second engine (Whisper/Moonshine/etc.), and it requires a real (if contained) code change inside the ASR layer.

### 2.4 Better lightweight alternative: language-specific fine-tuned Whisper checkpoints (stay on faster-whisper/CTranslate2)

This is not a different engine at all — it's the same `faster-whisper` + CTranslate2 stack already in production, pointed at **Whisper-base checkpoints that have been fine-tuned specifically for Hindi and Telugu** (e.g. the well-known `vasista22/whisper-hindi-base` and `vasista22/whisper-telugu-base` models, from the AI4Bharat-adjacent `vasistalodagala/whisper-finetune` project), converted to CTranslate2 the same way `Systran/faster-whisper-base` already is.

- **Multilingual support:** One base-sized checkpoint per language (English can keep the current multilingual `base` or switch to `base.en`; Hindi/Telugu each get their own fine-tuned checkpoint). Since the app already forces a specific language per call, loading the right checkpoint per language is a lookup, not a redesign.
- **Telugu quality:** `whisper-telugu-base` reports **13.4% WER** on the Google FLEURS Telugu test set — dramatically better than stock multilingual Whisper-base on Telugu (stock Whisper-base's published FLEURS numbers for lower-resource Indic languages are typically in the 40–90%+ WER range).
- **Hindi quality:** The equivalent `whisper-hindi-base` checkpoint reports similarly large WER reductions over stock Whisper-base on Hindi benchmarks (the same fine-tuning project also publishes `whisper-hindi-large-v2`, `-small`, `-medium` variants if more accuracy is later needed and memory allows).
- **English quality:** Unchanged — English keeps using the existing multilingual `base` (or `base.en`) checkpoint exactly as today.
- **CPU performance:** Identical to today, because it's the identical architecture, decoder, beam size, and CTranslate2 int8 runtime — only the trained weights differ.
- **Memory usage:** Same as the current `WhisperModel("base", ..., compute_type="int8")` per loaded checkpoint (~74M params). Running English + Hindi + Telugu concurrently loaded means roughly **3× the current single-model memory** (three base-sized int8 models resident at once) unless checkpoints are loaded lazily per language and idle ones are evicted — still far below Whisper-Small's footprint, and this is tunable (e.g. only keep the 1–2 most recently used languages resident in a small LRU).
- **Streaming support:** Unchanged — same chunk-based pseudo-streaming already in place.
- **Python API maturity:** Maximum — it's the exact same `faster-whisper`/`WhisperModel` API already imported, tested, and running in production.
- **Deployment complexity:** **Lowest of all options.** Conversion is a one-time offline step using `ct2-transformers-converter` (already installed in the project's own `venv311/Scripts/`, since it ships with `ctranslate2`), producing a local CTranslate2 model directory that `WhisperModel(<path>, device="cpu", compute_type="int8")` loads exactly like `"base"` does today. Community precedent for this exact conversion exists (e.g. `digikar/vasista22-whisper-hindi-large-v2-ct2-int8` on Hugging Face is a published int8 CTranslate2 conversion of this same fine-tuning family), confirming it's a well-trodden path, not a novel risk.
- **Verdict:** **the fastest, lowest-risk fix for the reported problem.** It directly targets "Whisper Base produces bad Telugu/Hindi transcription" without introducing a second inference engine, a new dependency, or any change outside one file.

### 2.5 For completeness: AI4Bharat IndicConformer-600M-Multilingual

Included because it's a natural "better Indic model" candidate, but ruled out for this deployment:

- **Multilingual support:** 22 official Indian languages including Hindi and Telugu — but **no English**, so it can't be the sole engine either.
- **Telugu/Hindi quality:** Purpose-built for Indian languages, generally regarded as strong for Hindi/Telugu, likely stronger than Dolphin-base on these specific languages given AI4Bharat's Indic-only focus and larger model.
- **CPU performance / memory:** ~600M parameters, and the standard `transformers` inference path pulls in `torch` + `torchaudio` — a large jump in both memory and dependency footprint compared to the current torch-free CTranslate2/onnxruntime setup. This is a real risk on a Render instance that already OOM'd on Whisper-Small (~244M params, CTranslate2, no torch).
- **Streaming / API:** No confirmed streaming; official inference is a straightforward `transformers` `AutoModel` call (`model(wav, "hi", "ctc")`), mature enough but heavier to deploy.
- **Verdict:** likely the best *pure accuracy* option for Hindi/Telugu specifically, but the **highest memory risk** of all candidates given this project's history of OOM crashes — only worth revisiting if the Render plan is upgraded with meaningfully more RAM headroom, or if it's exported to ONNX (removing the torch dependency) as the Dolphin model was.

---

## 3. Comparison Table

| Model | Hindi | Telugu | English | Streaming | Memory vs. current Whisper-base | New dependency? | Effort |
|---|---|---|---|---|---|---|---|
| Whisper-base (current) | Poor | Poor | Good | Chunked (current) | Baseline (~74M params, int8) | — | — |
| Whisper-small (rejected) | Better | Better | Good | Chunked | ~3× baseline → OOMs | None (already installed) | N/A (rejected) |
| SenseVoice-Small | ❌ Unsupported | ❌ Unsupported | Very good | No | ~Whisper-small class | `funasr`+torch, or ONNX | Disqualified |
| Moonshine (v2) | ❌ Unsupported | ❌ Unsupported | Excellent | Yes (true streaming) | Much lower than baseline | Lightweight, no torch | Disqualified |
| Sherpa-ONNX + Dolphin-base (Hindi/Telugu) + Whisper-base (English) | Much better | Much better | Unchanged | Chunked (no gain/loss) | ≈ baseline or lower per model | `sherpa-onnx`, `onnxruntime` (no torch) | Medium |
| **Fine-tuned Whisper-base checkpoints (Hindi/Telugu) via faster-whisper** | **Much better** | **Much better** | Unchanged | Chunked (current) | ≈ baseline per loaded checkpoint | None — same libraries | **Easy** |
| AI4Bharat IndicConformer-600M | Likely best | Likely best | ❌ Unsupported | Unconfirmed | Well above Whisper-small (+ torch) | `torch`, `torchaudio` | Hard |

---

## 4. Recommendation

**Primary recommendation — switch `whisper_service.py` to load language-specific fine-tuned Whisper-base checkpoints (Hindi and Telugu), converted to CTranslate2, while keeping the current multilingual/English `base` checkpoint for English.**

Reasons:
1. It solves the actual reported problem (bad Telugu/Hindi quality) with published WER improvements that are large enough to matter (e.g. Telugu FLEURS WER ~13% vs. stock base's much higher error rate on the same language).
2. It changes **zero** files outside `backend/app/ai/whisper_service.py` (and optionally `speech_to_text_service.py` for consistency on the file-upload endpoint).
3. It adds **no new dependency** — same `faster-whisper`/`ctranslate2` already in `requirements.txt`.
4. Memory per resident model stays at "base" scale, not "small" scale — it does not reintroduce the OOM risk that ruled out Whisper-Small. If all three languages must stay loaded simultaneously, plan for roughly 3× the current single-model memory (three base-class int8 models); if that's too tight, keep an LRU of 1–2 loaded models since a meeting is normally dominated by one or two active source languages at a time.
5. It's low-risk: this exact "fine-tune → CTranslate2 int8" conversion path already has a public precedent for this checkpoint family.

**Secondary recommendation (if fine-tuned Whisper-base still isn't accurate enough once tested against real meeting audio):** move Hindi/Telugu specifically to **Sherpa-ONNX running Dolphin-base**, while keeping Whisper (stock or fine-tuned) for English. This is a genuine engine swap for those two languages, with a larger published accuracy gain, but it's real engineering work — a new model-loading path, a different result schema to normalize back into the existing `{success, language, text, confidence, segments}` contract, and a new dependency to validate on Render.

**Not recommended for this deployment:** SenseVoice-Small and Moonshine (both disqualified — no Hindi/Telugu support), and AI4Bharat IndicConformer-600M (best raw accuracy candidate on paper, but its `torch`/`torchaudio` dependency and ~600M parameter size carry real risk of repeating the exact OOM crash that already ruled out Whisper-Small).

---

## 5. Exact Files That Would Require Changes

### Option A — Fine-tuned Whisper checkpoints via faster-whisper (recommended)

| File | Change |
|---|---|
| `backend/app/ai/whisper_service.py` | Replace the single `self._model = WhisperModel("base", ...)` with a small per-language registry, e.g. `self._models = {}` keyed by resolved language code, each lazily loaded from a local CTranslate2 model directory (`./models/whisper-hi-base-ct2`, `./models/whisper-te-base-ct2`, and the existing `"base"` for English). `get_model()` becomes `get_model(language)`. **`transcribe()`'s signature and return dict stay identical.** |
| `backend/app/services/speech_to_text_service.py` | Optional: currently calls `whisper_service.get_model()` with no language (auto-detect) for the file-upload endpoint. Leave as-is, or pass a language once the caller supplies one — not required for the realtime fix. |
| `backend/requirements.txt` | No change (checkpoints are converted offline, not installed as a package). |
| Model artifacts (new, not code) | Add converted CTranslate2 model directories to the deployment (or download-on-first-boot from Hugging Face) — a build/deploy concern, not application code. |

- **Whisper APIs replaced:** none — same `WhisperModel` class, same `.transcribe()` call signature and kwargs.
- **WebSocket flow:** unchanged.
- **Translation pipeline:** unchanged (it only ever sees the plain transcript string).

### Option B — Sherpa-ONNX + Dolphin-base for Hindi/Telugu

| File | Change |
|---|---|
| `backend/app/ai/whisper_service.py` | Add a second code path: for `language in {"hi", "te"}`, load and call a `sherpa_onnx.OfflineRecognizer` (Dolphin CTC) instead of `WhisperModel`; normalize its output back into the exact same `{success, language, text, confidence, segments}` dict shape `transcribe()` already returns (segments/confidence will need to be synthesized from whatever the CTC decoder exposes, since `avg_logprob`/`no_speech_prob`/`compression_ratio` are Whisper-specific). English (`"en"`) keeps calling the existing `WhisperModel("base", ...)` path. |
| `backend/app/services/speech_to_text_service.py` | Same dual-engine branch needed if the file-upload endpoint should also benefit (not required for the realtime fix alone). |
| `backend/requirements.txt` | Add `sherpa-onnx` (pulls in `onnxruntime`; no `torch`). |
| Model artifacts (new, not code) | Add the Dolphin-base int8 ONNX model files to the deployment. |

- **Whisper APIs replaced:** `WhisperModel(...)`/`.transcribe()` for Hindi and Telugu only, replaced by `sherpa_onnx.OfflineRecognizer` construction and `.decode()`/`.get_result()`-style calls (exact method names depend on the sherpa-onnx version pinned).
- **WebSocket flow:** unchanged — `meeting_socket.py` still calls `whisper_service.transcribe(pcm_samples, vad_filter=..., language=...)` exactly as today, because the engine-selection logic is hidden inside `whisper_service.py`.
- **Translation pipeline:** unchanged, same reasoning as Option A.

In both options, **`noise_detection_service.py`, `meeting_socket.py`, `connection_manager.py`, `translation_service.py`, `confidence_service.py`, `speech_accuracy_service.py`, `grammar_correction_service.py`, `human_review_service.py`, and `ai_feedback_service.py` require no changes**, because none of them talk to Whisper directly — they all go through `whisper_service.transcribe()`'s stable input/output contract.

---

## 6. Estimated Memory Usage (order-of-magnitude; verify with real RSS measurement on the actual Render instance before committing)

| Model | Approx. parameters | Approx. memory class vs. current Whisper-base (int8) |
|---|---|---|
| Whisper-base (current) | 74M | 1× (baseline) |
| Whisper-small (rejected) | 244M | ~3× baseline — already confirmed to OOM |
| Fine-tuned Whisper-*-base (Option A) | 74M each | 1× baseline **per loaded checkpoint** |
| Dolphin-base via sherpa-onnx (Option B) | 140M, CTC, int8 ONNX | Roughly 1×–1.5× baseline per model, likely less resident overhead than a seq2seq decoder of similar param count |
| SenseVoice-Small | ~230–240M | ~Whisper-small class |
| Moonshine tiny/base | 27M / 61M | Well under baseline |
| IndicConformer-600M | 600M + torch/torchaudio runtime | Well above Whisper-small class |

---

## 7. Expected Telugu/Hindi Accuracy Improvement Over Whisper-Base

| Option | Reported/estimated Telugu improvement | Reported/estimated Hindi improvement |
|---|---|---|
| A — Fine-tuned Whisper-base (vasista22 family) | `whisper-telugu-base` measured at **13.4% WER** on Google FLEURS Telugu (vs. much higher error for stock multilingual Whisper-base on the same low-resource language) | Equivalent `whisper-hindi-base` checkpoint shows a comparably large WER reduction over stock Whisper-base on published Hindi benchmarks |
| B — Dolphin-base via sherpa-onnx | Not separately published in the sources reviewed, but Dolphin's paper demonstrates the same pattern of large gains over Whisper-base on Eastern/South-Asian languages | Dolphin's own paper reports **29.9% WER vs. Whisper-base's 105.4% WER** on their internal Hindi test set — i.e., Whisper-base is close to unusable on that set, Dolphin-base is not |

Both numbers should be treated as directional, not guaranteed for your specific meeting audio (accented, noisy, real-time-chunked speech will generally score worse than clean benchmark test sets for any model) — the recommended next step is a small offline A/B using `backend/evaluation/evaluate_transcription.py` (already present in the repo) against a handful of real recorded Telugu/Hindi meeting clips before switching production traffic.

---

## 8. Approximate Implementation Effort

| Option | Effort | Why |
|---|---|---|
| **A — Fine-tuned Whisper-base checkpoints (Hindi/Telugu) via faster-whisper** | **Easy** | Same library, same API, same return schema, no new dependency; work is: convert 2 checkpoints once with the already-installed `ct2-transformers-converter`, add a language→model-path lookup in `whisper_service.py`, test. |
| B — Sherpa-ONNX + Dolphin-base for Hindi/Telugu, keep Whisper for English | Medium | New dependency, new model-loading API, output-schema normalization work inside `whisper_service.py`; everything else in the app is untouched. |
| SenseVoice-Small | N/A (disqualified) | No Hindi/Telugu support. |
| Moonshine | N/A (disqualified) | No Hindi/Telugu support. |
| IndicConformer-600M | Hard | Reintroduces `torch`/`torchaudio`, largest memory footprint of all options, real OOM risk on this Render instance, no confirmed streaming path. |

---

## Sources

- [FunAudioLLM/SenseVoiceSmall — Hugging Face](https://huggingface.co/FunAudioLLM/SenseVoiceSmall)
- [QwenAudio/SenseVoice — GitHub](https://github.com/QwenAudio/SenseVoice)
- [UsefulSensors/moonshine-streaming-tiny — Hugging Face](https://huggingface.co/UsefulSensors/moonshine-streaming-tiny)
- [Moonshine v2: Ergodic Streaming Encoder ASR for Latency-Critical Speech Applications — arXiv](https://arxiv.org/html/2602.12241v1)
- [k2-fsa/sherpa-onnx — GitHub](https://github.com/k2-fsa/sherpa-onnx)
- [Is there any ASR pretrained model to work with Hindi, Tamil and other Indic languages? — sherpa-onnx Discussion #3199](https://github.com/k2-fsa/sherpa-onnx/discussions/3199)
- [Dolphin: A Large-Scale Automatic Speech Recognition Model for Eastern Languages — arXiv](https://arxiv.org/html/2503.20212v1)
- [DataoceanAI/Dolphin — GitHub](https://github.com/DataoceanAI/Dolphin)
- [Dolphin languages.md — GitHub](https://github.com/DataoceanAI/Dolphin/blob/main/languages.md)
- [csukuangfj/sherpa-onnx-dolphin-base-ctc-multi-lang-int8-2025-04-02 — Hugging Face](https://huggingface.co/csukuangfj/sherpa-onnx-dolphin-base-ctc-multi-lang-int8-2025-04-02)
- [vasista22/whisper-telugu-base — Hugging Face](https://huggingface.co/vasista22/whisper-telugu-base)
- [vasista22/whisper-hindi-large-v2 — Hugging Face](https://huggingface.co/vasista22/whisper-hindi-large-v2)
- [vasistalodagala/whisper-finetune — GitHub](https://github.com/vasistalodagala/whisper-finetune)
- [digikar/vasista22-whisper-hindi-large-v2-ct2-int8 — Hugging Face](https://huggingface.co/digikar/vasista22-whisper-hindi-large-v2-ct2-int8)
- [ai4bharat/indic-conformer-600m-multilingual — Hugging Face](https://huggingface.co/ai4bharat/indic-conformer-600m-multilingual)
- [SYSTRAN/faster-whisper — GitHub](https://github.com/SYSTRAN/faster-whisper)
