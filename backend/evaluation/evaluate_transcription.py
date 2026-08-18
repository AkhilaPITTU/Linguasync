"""Evaluate Linguasync's production Whisper transcription against references.

Examples (run from the backend directory):
  python evaluation/evaluate_transcription.py --audio C:\\audio\\sample.webm --reference C:\\audio\\sample.txt
  python evaluation/evaluate_transcription.py --case C:\\audio\\a.webm C:\\refs\\a.txt --case C:\\audio\\b.wav C:\\refs\\b.txt
  python evaluation/evaluate_transcription.py --manifest C:\\evaluation\\cases.json
"""

from __future__ import annotations

import argparse
import json
import sys
import unicodedata
from pathlib import Path
from time import perf_counter

import av
import numpy as np

# Make `app` importable when this file is invoked directly from backend/.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.noise_detection_service import noise_detection_service


def normalize_words(text: str) -> list[str]:
    """Case/punctuation-normalize text for a conventional word-level WER."""
    normalized = "".join(
        " " if unicodedata.category(character).startswith("P") else character
        for character in (text or "").casefold()
    )
    return normalized.split()


def word_error_counts(reference: str, recognized: str) -> tuple[int, int, int]:
    """Return (substitutions, deletions, insertions) by Levenshtein traceback."""
    reference_words = normalize_words(reference)
    recognized_words = normalize_words(recognized)
    rows, columns = len(reference_words) + 1, len(recognized_words) + 1
    matrix = [[0] * columns for _ in range(rows)]

    for row in range(rows):
        matrix[row][0] = row
    for column in range(columns):
        matrix[0][column] = column

    for row in range(1, rows):
        for column in range(1, columns):
            if reference_words[row - 1] == recognized_words[column - 1]:
                matrix[row][column] = matrix[row - 1][column - 1]
            else:
                matrix[row][column] = min(
                    matrix[row - 1][column - 1] + 1,
                    matrix[row - 1][column] + 1,
                    matrix[row][column - 1] + 1,
                )

    substitutions = deletions = insertions = 0
    row, column = len(reference_words), len(recognized_words)
    while row or column:
        if row and column and reference_words[row - 1] == recognized_words[column - 1]:
            row, column = row - 1, column - 1
        elif row and column and matrix[row][column] == matrix[row - 1][column - 1] + 1:
            substitutions += 1
            row, column = row - 1, column - 1
        elif row and matrix[row][column] == matrix[row - 1][column] + 1:
            deletions += 1
            row -= 1
        else:
            insertions += 1
            column -= 1

    return substitutions, deletions, insertions


def decode_non_webm_audio(audio_path: Path) -> dict:
    """Use the live pipeline's PyAV mono float32 / 16 kHz ASR boundary."""
    with av.open(str(audio_path), mode="r") as container:
        stream = next(iter(container.streams.audio), None)
        if stream is None:
            raise ValueError("The audio file has no audio stream.")
        resampler = av.AudioResampler(format="flt", layout="mono", rate=16000)
        frames = []
        duration = 0.0
        for frame in container.decode(stream):
            duration += frame.samples / (frame.sample_rate or 16000)
            frames.extend(output.to_ndarray().reshape(-1) for output in resampler.resample(frame))

    if not frames:
        raise ValueError("The audio file contains no decodable PCM samples.")
    samples = np.ascontiguousarray(np.concatenate(frames).astype(np.float32, copy=False))
    rms = float(np.sqrt(np.mean(samples ** 2)))
    if duration < noise_detection_service.minimum_duration_seconds:
        raise ValueError("Audio is too short for the live transcription pipeline.")
    if rms < noise_detection_service.silence_threshold:
        raise ValueError("Audio is rejected by the live silence threshold.")
    return {"pcm_samples": samples, "duration": duration, "rms": rms}


def transcribe_case(audio_path: Path, language: str | None) -> tuple[dict, dict]:
    """Run the same live decode/Whisper service, without grammar or translation."""
    # Import lazily so --self-test can validate metrics without loading the model.
    from app.ai.whisper_service import whisper_service

    if not audio_path.is_file():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    if audio_path.suffix.lower() == ".webm":
        decoded = noise_detection_service.analyze(audio_path.read_bytes())
        if not decoded["is_valid"]:
            raise ValueError(f"Live audio validation rejected this file: {decoded['message']}")
    else:
        decoded = decode_non_webm_audio(audio_path)

    started = perf_counter()
    result = whisper_service.transcribe(
        decoded["pcm_samples"], vad_filter=True, language=language or None
    )
    result["processing_seconds"] = perf_counter() - started
    if not result.get("success"):
        raise RuntimeError(result.get("reason", "Whisper transcription failed."))
    return result, decoded


def print_case_report(index: int, audio_path: Path, reference: str, result: dict) -> dict:
    recognized = result.get("text", "")
    substitutions, deletions, insertions = word_error_counts(reference, recognized)
    reference_word_count = len(normalize_words(reference))
    errors = substitutions + deletions + insertions
    wer = (errors / reference_word_count) if reference_word_count else 0.0
    accuracy = max(0.0, (1.0 - wer) * 100)

    print(f"\n=== CASE {index}: {audio_path} ===")
    print(f"REFERENCE:\n{reference}")
    print(f"\nRECOGNIZED:\n{recognized}")
    print(f"\nWER: {wer * 100:.2f}%")
    print(f"WORD ACCURACY: {accuracy:.2f}%")
    print(f"SUBSTITUTIONS: {substitutions}")
    print(f"DELETIONS: {deletions}")
    print(f"INSERTIONS: {insertions}")
    print(f"LANGUAGE: {result.get('language')} ({result.get('language_probability')})")
    print(f"WHISPER CONFIDENCE: {result.get('confidence')}%")
    print(f"PROCESSING TIME: {result.get('processing_seconds', 0):.2f}s")
    return {
        "reference_words": reference_word_count,
        "substitutions": substitutions,
        "deletions": deletions,
        "insertions": insertions,
    }


def load_cases(args: argparse.Namespace) -> list[tuple[Path, Path, str | None]]:
    cases = []
    if args.audio or args.reference:
        if not args.audio or not args.reference:
            raise ValueError("--audio and --reference must be supplied together.")
        cases.append((Path(args.audio), Path(args.reference), args.language))
    for values in args.case:
        cases.append((Path(values[0]), Path(values[1]), args.language))
    if args.manifest:
        manifest_path = Path(args.manifest)
        items = json.loads(manifest_path.read_text(encoding="utf-8"))
        if not isinstance(items, list):
            raise ValueError("The manifest must be a JSON array.")
        for item in items:
            cases.append((
                manifest_path.parent / item["audio"],
                manifest_path.parent / item["reference"],
                item.get("language", args.language),
            ))
    if not cases:
        raise ValueError("Provide --audio/--reference, one or more --case pairs, or --manifest.")
    return cases


def run_self_test() -> None:
    reference = "Hello everyone welcome to the meeting"
    recognized = "Hello everyone welcome in the meeting"
    counts = word_error_counts(reference, recognized)
    assert counts == (1, 0, 0), counts
    wer = sum(counts) / len(normalize_words(reference))
    print("Metric self-test passed (synthetic text only; Whisper was not run).")
    print(f"WER: {wer * 100:.2f}%")
    print(f"WORD ACCURACY: {(1 - wer) * 100:.2f}%")
    print("SUBSTITUTIONS: 1\nDELETIONS: 0\nINSERTIONS: 0")


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate the production Linguasync Whisper pipeline.")
    parser.add_argument("--audio", help="One audio file (WebM uses the exact live decoder).")
    parser.add_argument("--reference", help="UTF-8 text file containing the ground-truth transcript.")
    parser.add_argument("--case", action="append", nargs=2, default=[], metavar=("AUDIO", "REFERENCE"), help="Repeatable audio/reference pair.")
    parser.add_argument("--manifest", help="JSON list of {audio, reference, language?} cases, paths relative to the manifest.")
    parser.add_argument("--language", help="Optional Whisper ISO language hint, e.g. en, te, hi.")
    parser.add_argument("--self-test", action="store_true", help="Validate the WER calculation without loading Whisper.")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return 0

    totals = {"reference_words": 0, "substitutions": 0, "deletions": 0, "insertions": 0}
    for index, (audio_path, reference_path, language) in enumerate(load_cases(args), start=1):
        reference = reference_path.read_text(encoding="utf-8").strip()
        if not reference:
            raise ValueError(f"Reference transcript is empty: {reference_path}")
        result, _decoded = transcribe_case(audio_path, language)
        metrics = print_case_report(index, audio_path, reference, result)
        for key, value in metrics.items():
            totals[key] += value

    total_errors = totals["substitutions"] + totals["deletions"] + totals["insertions"]
    overall_wer = total_errors / totals["reference_words"]
    print("\n=== OVERALL ===")
    print(f"AVERAGE WER: {overall_wer * 100:.2f}%")
    print(f"AVERAGE WORD ACCURACY: {max(0.0, (1.0 - overall_wer) * 100):.2f}%")
    print(f"TOTAL SUBSTITUTIONS: {totals['substitutions']}")
    print(f"TOTAL DELETIONS: {totals['deletions']}")
    print(f"TOTAL INSERTIONS: {totals['insertions']}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Evaluation failed: {error}", file=sys.stderr)
        raise SystemExit(1)
