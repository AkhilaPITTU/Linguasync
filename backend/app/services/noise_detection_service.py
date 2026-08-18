import io
import tempfile
import wave
from pathlib import Path

import av
import numpy as np


class NoiseDetectionService:
    """Measure real decoded PCM audio, never compressed WebM bytes."""

    def __init__(self):
        # Decoded PCM is normalized float audio. -54 dBFS accepts normal
        # speech while retaining a small silence floor.
        self.silence_threshold = 0.002
        self.good_audio_threshold = 0.03
        self.minimum_duration_seconds = 0.15

    def analyze(self, audio_bytes: bytes):
        if not audio_bytes:
            return self._result(False, 0.0, 0.0, 0.0, None, 0, "Empty audio received.")

        try:
            buffer = io.BytesIO(audio_bytes)

            # MediaRecorder is configured for WebM audio. Specifying the
            # demuxer avoids format probing ambiguity for in-memory streams.
            with av.open(buffer, mode="r", format="webm") as container:
                container_name = container.format.name
                print(
                    "[audio-decode] container="
                    f"{container.format.name} streams={len(container.streams)}"
                )

                audio_stream = next(iter(container.streams.audio), None)

                if audio_stream is None:
                    return self._result(False, 0.0, 0.0, 0.0, None, 0, "No audio stream found in chunk.")

                sample_rate = audio_stream.codec_context.sample_rate
                channels = audio_stream.codec_context.channels or 0
                codec_name = audio_stream.codec_context.name
                print(
                    "[audio-decode] codec="
                    f"{codec_name} rate={sample_rate}Hz channels={channels}"
                )

                # Decode browser Opus frames to actual mono floating-point
                # PCM before computing RMS. `to_ndarray()` alone preserves
                # the source sample format and can vary across browsers.
                # Faster-Whisper accepts float32 NumPy audio at 16 kHz. Use
                # this already-decoded PCM for ASR as well as quality checks,
                # avoiding a second WebM decode in the transcription path.
                # Keep a decoded mono float32 reference at the Opus sample
                # rate so ASR diagnostics can compare amplitude before and
                # after the required 16 kHz resample.
                source_rate = sample_rate or 48000
                analysis_resampler = av.AudioResampler(
                    format="flt", layout="mono", rate=source_rate
                )
                resampler = av.AudioResampler(
                    format="flt", layout="mono", rate=16000
                )
                frames = []
                pre_resample_frames = []
                duration = 0.0
                frame_count = 0

                for frame in container.decode(audio_stream):
                    frame_rate = frame.sample_rate or sample_rate
                    if frame_rate:
                        duration += frame.samples / frame_rate
                    frame_count += 1

                    if frame_count == 1:
                        print(
                            "[audio-decode] first-frame="
                            f"rate={frame_rate}Hz "
                            f"channels={frame.layout.channels} "
                            f"format={frame.format.name} samples={frame.samples}"
                        )

                    for pcm_frame in resampler.resample(frame):
                        frames.append(pcm_frame.to_ndarray().reshape(-1))
                    for pcm_frame in analysis_resampler.resample(frame):
                        pre_resample_frames.append(
                            pcm_frame.to_ndarray().reshape(-1)
                        )

                print(
                    "[audio-decode] decoded "
                    f"frames={frame_count} pcm_frames={len(frames)}"
                )

            if not frames:
                return self._result(False, 0.0, 0.0, duration, sample_rate, channels, "No decodable PCM samples in audio chunk.")

            if duration < self.minimum_duration_seconds:
                return self._result(False, 0.0, 0.0, duration, sample_rate, channels, "Audio chunk is too short for transcription.")

            samples = np.ascontiguousarray(
                np.concatenate(frames).astype(np.float32, copy=False)
            )
            pre_resample_samples = np.ascontiguousarray(
                np.concatenate(pre_resample_frames).astype(
                    np.float32, copy=False
                )
            )
            finite = bool(np.isfinite(samples).all())
            if not finite:
                return self._result(
                    False, 0.0, 0.0, duration, sample_rate, channels,
                    "Decoded PCM contains NaN or Infinity.", samples,
                    container_name=container_name, codec_name=codec_name,
                )
            rms = float(np.sqrt(np.mean(samples ** 2)))
            peak = float(np.max(np.abs(samples)))
            pre_resample_rms = float(
                np.sqrt(np.mean(pre_resample_samples ** 2))
            )
            pre_resample_peak = float(np.max(np.abs(pre_resample_samples)))
            silence_percentage = float(
                np.mean(np.abs(samples) < self.silence_threshold) * 100
            )
            speech_indices = np.flatnonzero(
                np.abs(samples) >= self.silence_threshold
            )
            speech_start_seconds = (
                round(float(speech_indices[0]) / 16000, 3)
                if speech_indices.size else None
            )
            speech_end_seconds = (
                round(float(speech_indices[-1]) / 16000, 3)
                if speech_indices.size else None
            )

            if rms < self.silence_threshold:
                return self._result(False, 0.0, rms, duration, sample_rate, channels, "Silence detected from decoded PCM.", samples, peak, container_name, codec_name, silence_percentage, pre_resample_rms, pre_resample_peak, speech_start_seconds, speech_end_seconds)

            quality = min((rms / self.good_audio_threshold) * 100, 100)
            return self._result(True, quality, rms, duration, sample_rate, channels, "Audio accepted.", samples, peak, container_name, codec_name, silence_percentage, pre_resample_rms, pre_resample_peak, speech_start_seconds, speech_end_seconds)

        except Exception as error:
            print(f"[audio-decode] failed: {type(error).__name__}: {error}")
            return self._result(False, 0.0, 0.0, 0.0, None, 0, f"Unable to decode audio chunk: {error}")

    @staticmethod
    def save_debug_wav(samples: np.ndarray, chunk_id: str) -> str:
        """Write a standard 16 kHz mono PCM WAV for offline ASR checks."""
        path = Path(tempfile.gettempdir()) / f"linguasync-asr-{chunk_id}.wav"
        # The live Whisper call still receives the original float32 array.
        # This file is a dependency-free diagnostic copy for playback and
        # offline comparison, converted once to standard PCM16 WAV.
        pcm16 = np.clip(samples, -1.0, 1.0)
        pcm16 = (pcm16 * 32767.0).astype("<i2", copy=False)
        with wave.open(str(path), "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(16000)
            wav_file.writeframes(pcm16.tobytes())
        return str(path)

    @staticmethod
    def _result(
        is_valid, quality, rms, duration, sample_rate, channels, message,
        pcm_samples=None, peak=0.0, container_name=None, codec_name=None,
        silence_percentage=0.0, pre_resample_rms=0.0,
        pre_resample_peak=0.0, speech_start_seconds=None,
        speech_end_seconds=None,
    ):
        return {
            "is_valid": is_valid,
            "audio_quality": round(float(quality), 2),
            "rms": round(float(rms), 5),
            "pre_resample_rms": round(float(pre_resample_rms), 5),
            "duration": round(float(duration), 3),
            "sample_rate": sample_rate,
            "channels": channels,
            "whisper_sample_rate": 16000 if pcm_samples is not None else None,
            "pcm_samples": pcm_samples,
            "pcm_dtype": str(pcm_samples.dtype) if pcm_samples is not None else None,
            "pcm_min": round(float(np.min(pcm_samples)), 5) if pcm_samples is not None and pcm_samples.size else 0.0,
            "pcm_max": round(float(np.max(pcm_samples)), 5) if pcm_samples is not None and pcm_samples.size else 0.0,
            "pcm_finite": bool(np.isfinite(pcm_samples).all()) if pcm_samples is not None else False,
            "peak": round(float(peak), 5),
            "pre_resample_peak": round(float(pre_resample_peak), 5),
            "silence": bool(rms < 0.002),
            "silence_percentage": round(silence_percentage, 2),
            "speech_start_seconds": speech_start_seconds,
            "speech_end_seconds": speech_end_seconds,
            "clipping": bool(peak >= 0.99),
            "container": container_name,
            "codec": codec_name,
            "message": message,
        }


noise_detection_service = NoiseDetectionService()
