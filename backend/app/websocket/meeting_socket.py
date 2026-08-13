import asyncio
import os
from datetime import datetime, timezone
from time import perf_counter
from uuid import uuid4

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from app.config.security import get_user_id
from app.websocket.connection_manager import manager
from app.ai.whisper_service import whisper_service
from app.ai.translation_service import translation_service
from app.config.database import database
from app.services.noise_detection_service import noise_detection_service
from app.services.speech_accuracy_service import speech_accuracy_service
from app.services.grammar_correction_service import grammar_correction_service
from app.services.confidence_service import confidence_service
from app.services.human_review_service import human_review_service
from app.services.ai_feedback_service import ai_feedback_service
from app.services.text_to_speech_service import text_to_speech_service

router = APIRouter()

meetings_collection = database["meetings"]
transcripts_collection = database["transcripts"]

LANGUAGE_MAP = {
    "English": "en",
    "Telugu": "te",
    "Hindi": "hi",
    "Tamil": "ta",
    "Kannada": "kn",
    "Malayalam": "ml",
    "French": "fr",
    "German": "de",
    "Spanish": "es",
    "Bengali": "bn",
    "Marathi": "mr",
    "Gujarati": "gu",
    "Punjabi": "pa",
    "Urdu": "ur",
    "Italian": "it",
    "Portuguese": "pt",
    "Russian": "ru",
    "Chinese": "zh",
    "Japanese": "ja",
    "Korean": "ko",
}

# How many audio_stream chunks we'll let queue up per connection
# before we start dropping the oldest ones. This is a safety valve:
# if a client sends chunks faster than the AI pipeline can drain
# them (e.g. transcription is slow), we don't want unbounded memory
# growth or an ever-growing backlog of stale audio.
MAX_QUEUED_CHUNKS = 5
MAX_POSTPROCESS_CHUNKS = 5
ASR_DEBUG_ONLY = os.getenv("ASR_DEBUG_ONLY", "false").lower() == "true"
# ASR-only debugging defaults to VAD off, because the diagnostic question is
# whether faster-whisper itself can recognize the complete validated chunk.
# Production processing keeps VAD enabled unless explicitly overridden.
ASR_DEBUG_DISABLE_VAD = os.getenv(
    "ASR_DEBUG_DISABLE_VAD", "true" if ASR_DEBUG_ONLY else "false"
).lower() == "true"
ASR_DEBUG_SAVE_WAV = os.getenv("ASR_DEBUG_SAVE_WAV", "false").lower() == "true"

# NLLB keeps mutable tokenizer state (`src_lang`). One generation at a time
# protects that shared model while post-processing remains independent from
# the high-priority audio workers.
translation_model_lock = asyncio.Lock()


def _get_user_name(meeting: dict, user_id: str) -> str:
    """Look up a participant's display name from the meeting document."""
    for participant in meeting.get("participants", []):
        if participant.get("user_id") == user_id:
            return participant.get("user_name", "Participant")
    return "Participant"


def _normalize_output_mode(mode: str) -> str:
    """Support existing meeting modes while using per-call preferences."""
    return {
        "original": "none",
        "text": "subtitle",
        "speech": "voice",
        "translated_speech": "voice",
        "text_speech": "subtitle_voice",
    }.get(mode, mode if mode in {
        "none", "transcription", "subtitle", "voice", "subtitle_voice"
    } else "none")


def _get_participant(meeting: dict, user_id: str) -> dict:
    for participant in meeting.get("participants", []):
        if participant.get("user_id") == user_id:
            return participant
    return {}


def _connected_participants(meeting: dict, meeting_id: str) -> list:
    """Return persisted preference data for users connected to this room."""
    participants = []
    for connected_user_id in manager.get_participants(meeting_id):
        participant = _get_participant(meeting, connected_user_id)
        participants.append({
            "user_id": connected_user_id,
            "user_name": participant.get("user_name", "Participant"),
            "preferred_language": participant.get(
                "preferred_language", participant.get("language", "English")
            ),
            "output_mode": _normalize_output_mode(
                participant.get("output_mode", "none")
            ),
        })
    return participants


async def _process_audio_chunk(
    meeting_id: str,
    user_id: str,
    data: dict,
    postprocess_queue: "asyncio.Queue[dict]",
):
    """
    Runs the full audio pipeline for a single chunk: noise check,
    transcription, grammar correction, confidence scoring, translation,
    and delivery. This is intentionally identical in logic to the
    original inline version -- it's just been moved into its own
    function so it can run from a background worker task instead of
    directly inside the message-receive loop.
    """
    try:
        audio_started_at = perf_counter()
        # The id is assigned when the message enters the queue, so every
        # receive/queue/decode/transcript/translation log line can be traced
        # back to the same browser recording.
        chunk_id = data.get("chunk_id") or str(uuid4())
        audio_bytes = bytes(data.get("audio", []))
        user_name = data.get("user_name", "Participant")
        meeting = await meetings_collection.find_one(
            {"meeting_id": meeting_id}, {"_id": 0, "participants": 1}
        )
        speaker = _get_participant(meeting or {}, user_id)
        configured_source_language = speaker.get("source_language") or LANGUAGE_MAP.get(
            speaker.get("preferred_language", speaker.get("language", "")),
        )

        print(
            f"[audio:{chunk_id}] received bytes={len(audio_bytes)} "
            f"user={user_id} name={user_name!r}"
        )

        decode_started_at = perf_counter()
        noise_result = await asyncio.to_thread(
            noise_detection_service.analyze,
            audio_bytes
        )
        decode_seconds = perf_counter() - decode_started_at

        print(
            f"[audio:{chunk_id}] decode duration={noise_result.get('duration')}s "
            f"rate={noise_result.get('sample_rate')}Hz "
            f"channels={noise_result.get('channels')} rms={noise_result.get('rms')} "
            f"accepted={noise_result['is_valid']} reason={noise_result.get('message')}"
        )
        print(
            f"[AUDIO-TRACE] chunk_id={chunk_id} user_id={user_id} "
            f"configured_source_language={configured_source_language} "
            f"received_bytes={len(audio_bytes)} container={noise_result.get('container')} "
            f"codec={noise_result.get('codec')} sample_rate={noise_result.get('whisper_sample_rate')} "
            f"channels=1 duration={noise_result.get('duration')} "
            f"pcm_sample_count={getattr(noise_result.get('pcm_samples'), 'size', 0)} "
            f"pcm_dtype={noise_result.get('pcm_dtype')} pcm_min={noise_result.get('pcm_min')} "
            f"pcm_max={noise_result.get('pcm_max')} pcm_rms={noise_result.get('rms')} "
            f"peak={noise_result.get('peak')} silence_percentage="
            f"{noise_result.get('silence_percentage')} speech_start="
            f"{noise_result.get('speech_start_seconds')} speech_end="
            f"{noise_result.get('speech_end_seconds')}"
        )

        if not noise_result["is_valid"]:
            await manager.send_personal_message(
                {
                    "type": "audio_warning",
                    "message": noise_result["message"],
                    "audio_quality": noise_result["audio_quality"]
                },
                meeting_id,
                user_id
            )
            return

        audio_quality = noise_result["audio_quality"]

        print(f"[audio:{chunk_id}] Whisper start")
        transcription_started_at = perf_counter()
        pcm_samples = noise_result.get("pcm_samples")
        print(
            f"[WHISPER-INPUT] chunk_id={chunk_id} user_id={user_id} "
            f"language_hint={configured_source_language} sample_rate="
            f"{noise_result.get('whisper_sample_rate')} channels=1 "
            f"duration={noise_result.get('duration')} number_of_samples="
            f"{getattr(pcm_samples, 'size', 0)} dtype={getattr(pcm_samples, 'dtype', None)} "
            f"rms_before={noise_result.get('pre_resample_rms')} "
            f"rms_after={noise_result.get('rms')} "
            f"peak_before={noise_result.get('pre_resample_peak')} "
            f"peak_after={noise_result.get('peak')} "
            f"finite={noise_result.get('pcm_finite')} contiguous="
            f"{getattr(getattr(pcm_samples, 'flags', None), 'c_contiguous', None)} "
            f"first_20_samples={pcm_samples[:20].tolist() if pcm_samples is not None else []}"
        )
        if ASR_DEBUG_SAVE_WAV:
            wav_path = noise_detection_service.save_debug_wav(
                pcm_samples, chunk_id
            )
            print(f"[ASR-DEBUG-WAV] chunk_id={chunk_id} path={wav_path}")
        vad_filter = not (ASR_DEBUG_ONLY and ASR_DEBUG_DISABLE_VAD)
        print(
            f"[WHISPER-CONFIG] chunk_id={chunk_id} task=transcribe "
            f"language_hint={configured_source_language} beam_size=5 temperature=0.0 "
            f"vad_filter={vad_filter} condition_on_previous_text=False"
        )
        transcript_result = await asyncio.to_thread(
            whisper_service.transcribe,
            pcm_samples,
            vad_filter=vad_filter,
            language=configured_source_language,
        )
        transcription_seconds = perf_counter() - transcription_started_at

        if not transcript_result.get("success", True):
            print(
                f"[audio:{chunk_id}] Whisper failure: "
                f"{transcript_result.get('reason')}"
            )
            return

        transcript = transcript_result.get("text", "")
        detected_language = transcript_result.get("language")
        whisper_confidence = transcript_result.get("confidence", 0)

        print(
            f"[WHISPER-OUTPUT] chunk_id={chunk_id} "
            f"detected_language={detected_language} language_probability="
            f"{transcript_result.get('language_probability')} "
            f"segment_count={len(transcript_result.get('segments', []))} "
            f"duration={transcription_seconds:.2f}s raw_text={transcript!r}"
        )
        print(
            f"[STT] speaker_id={user_id} configured_source_language="
            f"{configured_source_language} detected_language={detected_language} "
            f"language_probability={transcript_result.get('language_probability')} "
            f"transcript={transcript!r}"
        )
        if configured_source_language and detected_language and configured_source_language != detected_language:
            print(
                f"[STT] language_hint_mismatch speaker_id={user_id} "
                f"configured={configured_source_language} detected={detected_language}"
            )
        for segment in transcript_result.get("segments", []):
            print(
                f"[WHISPER-SEGMENT] chunk_id={chunk_id} start={segment.get('start')} "
                f"end={segment.get('end')} text={segment.get('text')!r} "
                f"avg_logprob={segment.get('avg_logprob')} "
                f"no_speech_prob={segment.get('no_speech_prob')} "
                f"compression_ratio={segment.get('compression_ratio')}"
            )

        if not transcript.strip():
            print(f"[audio:{chunk_id}] Whisper returned empty text.")
            return

        if not isinstance(detected_language, str) or not detected_language.strip():
            print(
                f"[audio:{chunk_id}] Whisper returned no detected language; "
                "transcript and translation skipped."
            )
            return

        translation_source_language = detected_language.strip()

        if ASR_DEBUG_ONLY:
            print(
                f"[ASR-DEBUG-ONLY] chunk_id={chunk_id} raw_text={transcript!r}; "
                "grammar, transcript dispatch, translation, feedback and TTS skipped"
            )
            return

        grammar_started_at = perf_counter()
        grammar_result = await asyncio.to_thread(
            grammar_correction_service.correct,
            transcript
        )
        grammar_seconds = perf_counter() - grammar_started_at
        transcript = grammar_result["corrected_text"]
        grammar_modified = grammar_result["modified"]

        print(
            f"[GRAMMAR] chunk_id={chunk_id} input_text="
            f"{grammar_result['original_text']!r} corrected_text={transcript!r}"
        )

        print(
            f"[transcript:{chunk_id}] speaker={user_id} "
            f"name={user_name!r} source={translation_source_language} "
            f"final={transcript!r}"
        )

        # Deliver captions as soon as transcription and grammar cleanup
        # complete. Translation, feedback persistence, and quality scoring
        # continue below without delaying the live transcript UI.
        dispatch_started_at = perf_counter()
        transcript_recipients = await manager.broadcast(
            meeting_id,
            {
                "type": "transcript",
                "chunk_id": chunk_id,
                "user_id": user_id,
                "speaker_id": user_id,
                "user_name": user_name,
                "speaker_name": user_name,
                "text": transcript,
                "language": translation_source_language,
                "source_language": translation_source_language,
                "confidence": whisper_confidence,
                "grammar_corrected": grammar_modified,
                "original_text": grammar_result["original_text"],
                "is_corrected": False,
                "correctable": True,
            }
        )
        dispatch_seconds = perf_counter() - dispatch_started_at

        await transcripts_collection.update_one(
            {"meeting_id": meeting_id, "chunk_id": chunk_id},
            {"$set": {
                "meeting_id": meeting_id, "chunk_id": chunk_id,
                "speaker_id": user_id, "speaker_name": user_name,
                "language": translation_source_language, "original_text": grammar_result["original_text"],
                "text": transcript, "is_corrected": False,
                "created_at": datetime.now(timezone.utc),
            }},
            upsert=True,
        )

        print(
            f"[transcript-dispatch] chunk_id={chunk_id} speaker_id={user_id} "
            f"speaker_name={user_name!r} source_language={translation_source_language} "
            f"text={transcript!r} recipients={transcript_recipients}"
        )
        print(
            f"[ASR-TIMING] chunk_id={chunk_id} decode_ms={decode_seconds * 1000:.0f} "
            f"whisper_ms={transcription_seconds * 1000:.0f} "
            f"grammar_ms={grammar_seconds * 1000:.0f} "
            f"transcript_dispatch_ms={dispatch_seconds * 1000:.0f} "
            f"total_ms={(perf_counter() - audio_started_at) * 1000:.0f}"
        )

        job = {
            "chunk_id": chunk_id, "user_id": user_id, "user_name": user_name,
            "transcript": transcript, "detected_language": translation_source_language,
            "whisper_confidence": whisper_confidence, "audio_quality": audio_quality,
            "grammar_result": grammar_result, "grammar_modified": grammar_modified,
        }
        if postprocess_queue.full():
            dropped_job = postprocess_queue.get_nowait()
            postprocess_queue.task_done()
            print(f"[postprocess-drop] speaker={dropped_job['user_id']} chunk_id={dropped_job['chunk_id']}")
        postprocess_queue.put_nowait(job)
        print(f"[audio-worker] user={user_id} chunk_id={chunk_id} postprocess_queue={postprocess_queue.qsize()}/{MAX_POSTPROCESS_CHUNKS}")

    except Exception as e:
        await manager.send_personal_message(
            {
                "type": "error",
                "message": str(e)
            },
            meeting_id,
            user_id
        )


async def _postprocess_transcript(meeting_id: str, job: dict):
    """Deliver recipient-specific translations without delaying audio."""
    chunk_id = job["chunk_id"]

    async def persist_feedback():
        """Keep feedback persistence independent from translation delivery."""
        try:
            speech = await asyncio.to_thread(
                speech_accuracy_service.analyze,
                job["transcript"], job["whisper_confidence"]
            )
            confidence = await asyncio.to_thread(
                confidence_service.calculate,
                job["whisper_confidence"], job["audio_quality"], speech["accuracy"]
            )
            review = await asyncio.to_thread(
                human_review_service.evaluate, confidence["confidence"]
            )
            await ai_feedback_service.save_feedback(
                meeting_id=meeting_id, user_id=job["user_id"],
                original_text=job["grammar_result"]["original_text"],
                corrected_text=job["transcript"], translated_text=job["transcript"],
                whisper_confidence=job["whisper_confidence"],
                audio_quality=job["audio_quality"], speech_accuracy=speech["accuracy"],
                overall_confidence=confidence["confidence"],
                confidence_level=confidence["level"], review_required=review["review_required"],
            )
            print(f"[feedback:{chunk_id}] persistence complete")
        except Exception as error:
            print(f"[feedback:{chunk_id}] persistence failed: {type(error).__name__}: {error}")
    participants_doc = await meetings_collection.find_one(
        {"meeting_id": meeting_id}, {"_id": 0, "participants": 1}
    )
    connected_ids = set(manager.get_participants(meeting_id))
    recipients_by_language = {}
    for participant in (participants_doc or {}).get("participants", []):
        recipient_id = participant.get("user_id")
        if recipient_id not in connected_ids:
            continue
        language = participant.get("preferred_language", participant.get("language"))
        output_mode = _normalize_output_mode(participant.get("output_mode", "none"))
        name = participant.get("user_name", "Participant")
        print(
            f"[recipient-preference] recipient_id={recipient_id} "
            f"recipient_name={name!r} preferred_language={language} "
            f"output_mode={output_mode}"
        )
        if output_mode in {"subtitle", "voice", "subtitle_voice"}:
            recipients_by_language.setdefault(language, []).append(
                (recipient_id, name, output_mode)
            )

    async def translate_and_deliver(language, recipients):
        target_code = LANGUAGE_MAP.get(language)
        started = perf_counter()
        if not target_code:
            result = {"success": False, "reason": "unsupported_recipient_language"}
        else:
            # The shared NLLB tokenizer changes src_lang, so serialize model
            # access while allowing audio and WebSocket processing to continue.
            async with translation_model_lock:
                result = await asyncio.to_thread(
                    translation_service.translate,
                    job["transcript"],
                    source_lang=job["detected_language"],
                    target_lang=target_code,
                )
        elapsed = perf_counter() - started
        for recipient_id, recipient_name, output_mode in recipients:
            if not result.get("success"):
                print(
                    f"[translation-routing] chunk_id={chunk_id} speaker_id={job['user_id']} "
                    f"recipient_id={recipient_id} recipient_name={recipient_name!r} "
                    f"preferred_language={language} target_language={language} "
                    f"output_mode={output_mode} elapsed={elapsed:.2f}s delivered=False "
                    f"reason={result.get('reason')}"
                )
                continue
            translated_text = result["translated_text"]
            audio_url = None
            if output_mode in {"voice", "subtitle_voice"}:
                try:
                    tts = await text_to_speech_service.text_to_speech(translated_text, target_code)
                    if tts.get("success"):
                        audio_url = f"/generated_audio/{tts['filename']}"
                except Exception as error:
                    print(f"[translation:{chunk_id}] TTS failed recipient={recipient_id}: {error}")
            delivered = await manager.send_personal_message(
                {
                    "type": "translation", "chunk_id": chunk_id,
                    "user_id": job["user_id"], "speaker_id": job["user_id"],
                    "user_name": job["user_name"], "speaker_name": job["user_name"],
                    "recipient_id": recipient_id, "source_language": job["detected_language"],
                    "target_language": language, "output_mode": output_mode,
                    "is_subtitle": output_mode in {"subtitle", "subtitle_voice"},
                    "text": translated_text if output_mode in {"subtitle", "subtitle_voice"} else "",
                    "source_text": job["transcript"],
                    "translated_text": translated_text,
                    "audio_url": audio_url, "confidence": job["whisper_confidence"],
                    "audio_quality": job["audio_quality"],
                    "grammar_corrected": job["grammar_modified"],
                }, meeting_id, recipient_id
            )
            print(
                f"[translation-routing] chunk_id={chunk_id} speaker_id={job['user_id']} "
                f"speaker_name={job['user_name']!r} recipient_id={recipient_id} "
                f"recipient_name={recipient_name!r} preferred_language={language} "
                f"target_language={language} output_mode={output_mode} "
                f"source_text={job['transcript']!r} translated_text={translated_text!r} "
                f"elapsed={elapsed:.2f}s delivered={delivered}"
            )
            print(
                f"[TRANSLATION-TIMING] chunk_id={chunk_id} "
                f"source={job['detected_language']} target={language} "
                f"translation_ms={elapsed * 1000:.0f}"
            )

    await asyncio.gather(persist_feedback(), *[
        translate_and_deliver(language, recipients)
        for language, recipients in recipients_by_language.items()
    ])


async def _postprocess_worker(meeting_id: str, user_id: str, queue: "asyncio.Queue[dict]"):
    while True:
        job = await queue.get()
        started = perf_counter()
        try:
            await _postprocess_transcript(meeting_id, job)
        except Exception as error:
            print(f"[postprocess] speaker={user_id} chunk_id={job.get('chunk_id')} failed: {error}")
        finally:
            print(f"[postprocess] speaker={user_id} chunk_id={job.get('chunk_id')} elapsed={perf_counter() - started:.2f}s")
            queue.task_done()


async def _audio_worker(meeting_id: str, user_id: str, queue: "asyncio.Queue[dict]", postprocess_queue: "asyncio.Queue[dict]"):
    """
    Drains the per-connection audio queue one chunk at a time. Running
    this as its own task -- separate from the message-receive loop --
    means a slow pipeline run no longer blocks reading the next
    WebSocket message (offer/answer/ice_candidate/chat/etc. all stay
    responsive), and it also means we only ever have ONE audio
    pipeline in flight per connection, instead of the receive loop
    accidentally kicking off overlapping runs.
    """
    while True:
        data = await queue.get()
        try:
            if data is None:  # sentinel used to stop the worker
                return
            started = perf_counter()
            await _process_audio_chunk(meeting_id, user_id, data, postprocess_queue)
            print(f"[audio-worker] user={user_id} chunk_id={data.get('chunk_id')} elapsed={perf_counter() - started:.2f}s queue_size={queue.qsize()}")
        finally:
            queue.task_done()


# =====================================================
# MEETING WEBSOCKET
# =====================================================

@router.websocket("/ws/meeting/{meeting_id}/{user_id}")
async def meeting_socket(
    websocket: WebSocket,
    meeting_id: str,
    user_id: str,
    token: str | None = Query(default=None),
):

    authenticated_user_id = get_user_id(token) if token else None
    if not authenticated_user_id or str(authenticated_user_id) != str(user_id):
        await websocket.close(code=1008)
        return

    await manager.connect(
        meeting_id,
        user_id,
        websocket
    )

    meeting = await meetings_collection.find_one(
        {
            "meeting_id": meeting_id,
            "status": "active"
        }
    )

    if meeting is None:
        await websocket.send_json(
            {
                "type": "error",
                "message": "Meeting not found."
            }
        )
        await websocket.close()
        return

    participant = _get_participant(meeting, user_id)
    user_name = participant.get("user_name", "Participant")
    preferred_language = participant.get(
        "preferred_language", participant.get("language", "English")
    )
    output_mode = _normalize_output_mode(participant.get("output_mode", "none"))

    print("\n========== WEBSOCKET JOIN ==========")
    print("Meeting:", meeting_id)
    print("Connected Users:", manager.get_participants(meeting_id))
    print("Broadcast User:", user_id)
    print(
        f"[USER-JOINED] meeting_id={meeting_id} joined_user={user_id} "
        f"existing_users={manager.get_participants(meeting_id)} "
        f"socket_instance_id={id(websocket)}"
    )
    await manager.broadcast(
        meeting_id,
        {
            "type": "user_joined",
            "user_id": user_id,
            "user_name": user_name,
            "preferred_language": preferred_language,
            "output_mode": output_mode,
            "participants": _connected_participants(meeting, meeting_id)
        }
    )

    # Bounded queue + dedicated worker task for this connection's
    # audio chunks. maxsize enforces MAX_QUEUED_CHUNKS; when full we
    # drop the oldest queued chunk rather than blocking the receive
    # loop or growing memory unboundedly.
    audio_queue: "asyncio.Queue[dict]" = asyncio.Queue(maxsize=MAX_QUEUED_CHUNKS)
    postprocess_queue: "asyncio.Queue[dict]" = asyncio.Queue(
        maxsize=MAX_POSTPROCESS_CHUNKS
    )
    worker_task = asyncio.create_task(
        _audio_worker(meeting_id, user_id, audio_queue, postprocess_queue)
    )
    postprocess_task = asyncio.create_task(
        _postprocess_worker(meeting_id, user_id, postprocess_queue)
    )

    try:
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")

            # ==========================================
            # CHAT MESSAGE
            # ==========================================
            if message_type == "chat":
                await manager.broadcast(
                    meeting_id,
                    {
                        "type": "chat",
                        "user_id": user_id,
                        "name": user_name,
                        "user_name": user_name,
                        "text": data.get("text"),
                        "time": data.get("time")
                    }
                )

            # ==========================================
            # WEBRTC OFFER
            # ==========================================
            elif message_type == "offer":
                offer_meeting = await meetings_collection.find_one(
                    {"meeting_id": meeting_id},
                    {"_id": 0, "participants": 1}
                )
                sender_name = _get_user_name(offer_meeting or {}, user_id)
                sender_participant = _get_participant(
                    offer_meeting or {}, user_id
                )

                await manager.send_personal_message(
                    {
                        "type": "offer",
                        "from": user_id,
                        "user_name": sender_name,
                        "preferred_language": sender_participant.get(
                            "preferred_language",
                            sender_participant.get("language", "English"),
                        ),
                        "output_mode": _normalize_output_mode(
                            sender_participant.get("output_mode", "none")
                        ),
                        "offer": data.get("offer")
                    },
                    meeting_id,
                    data.get("target")
                )

            # ==========================================
            # WEBRTC ANSWER
            # ==========================================
            elif message_type == "answer":
                answer_meeting = await meetings_collection.find_one(
                    {"meeting_id": meeting_id},
                    {"_id": 0, "participants": 1}
                )
                sender_name = _get_user_name(answer_meeting or {}, user_id)
                sender_participant = _get_participant(
                    answer_meeting or {}, user_id
                )

                await manager.send_personal_message(
                    {
                        "type": "answer",
                        "from": user_id,
                        "user_name": sender_name,
                        "preferred_language": sender_participant.get(
                            "preferred_language",
                            sender_participant.get("language", "English"),
                        ),
                        "output_mode": _normalize_output_mode(
                            sender_participant.get("output_mode", "none")
                        ),
                        "answer": data.get("answer")
                    },
                    meeting_id,
                    data.get("target")
                )

            # ==========================================
            # ICE CANDIDATE
            # ==========================================
            elif message_type == "ice_candidate":
                await manager.send_personal_message(
                    {
                        "type": "ice_candidate",
                        "from": user_id,
                        "candidate": data.get("candidate")
                    },
                    meeting_id,
                    data.get("target")
                )

            # ==========================================
            # AUDIO STREAM
            # ==========================================
            # Instead of running the full pipeline inline here (which
            # blocked this loop -- and therefore offer/answer/ice
            # relaying -- for the entire duration of transcription +
            # translation + DB writes), we just hand the chunk off to
            # the per-connection queue/worker and immediately go back
            # to listening for the next message.
            elif message_type == "audio_stream":
                chunk_id = str(uuid4())
                print(
                    f"[audio:{chunk_id}] queue user={user_id} "
                    f"size={audio_queue.qsize()}/{MAX_QUEUED_CHUNKS}"
                )
                # Preserve the authenticated meeting participant's display
                # name with the queued chunk so the transcript event can be
                # rendered without a second lookup in the hot path.
                data["chunk_id"] = chunk_id
                data["user_name"] = user_name
                if audio_queue.full():
                    # Drop the oldest queued chunk to make room. We
                    # care about keeping up with live speech, not
                    # about processing every single chunk ever sent.
                    try:
                        dropped_data = audio_queue.get_nowait()
                        audio_queue.task_done()
                        dropped_chunk_id = dropped_data.get(
                            "chunk_id", "unknown"
                        )
                        print(
                            f"[audio:{dropped_chunk_id}] queue drop "
                            f"user={user_id}"
                        )
                    except asyncio.QueueEmpty:
                        pass

                await audio_queue.put(data)

            # Preferences are persisted through the existing meeting join
            # endpoint. This event only synchronizes that saved state to
            # connected clients; it does not affect WebRTC or media streams.
            elif message_type == "participant_preferences":
                preference_meeting = await meetings_collection.find_one(
                    {"meeting_id": meeting_id},
                    {"_id": 0, "participants": 1},
                )
                updated_participant = _get_participant(
                    preference_meeting or {}, user_id
                )
                await manager.broadcast(
                    meeting_id,
                    {
                        "type": "participant_preferences",
                        "user_id": user_id,
                        "user_name": updated_participant.get(
                            "user_name", user_name
                        ),
                        "preferred_language": updated_participant.get(
                            "preferred_language",
                            updated_participant.get("language", "English"),
                        ),
                        "source_language": updated_participant.get("source_language"),
                        "output_mode": _normalize_output_mode(
                            updated_participant.get("output_mode", "none")
                        ),
                    },
                )

            # ==========================================
            # MANUAL TRANSCRIPT
            # ==========================================
            elif message_type == "transcript":
                chunk_id = str(uuid4())
                transcript_recipients = await manager.broadcast(
                    meeting_id,
                    {
                        "type": "transcript",
                        "chunk_id": chunk_id,
                        "user_id": user_id,
                        "speaker_id": user_id,
                        "user_name": user_name,
                        "speaker_name": user_name,
                        "text": data.get("text"),
                        "language": data.get("language", "en")
                    }
                )
                manual_text = data.get("text", "")
                await transcripts_collection.update_one(
                    {"meeting_id": meeting_id, "chunk_id": chunk_id},
                    {"$set": {
                        "meeting_id": meeting_id, "chunk_id": chunk_id,
                        "speaker_id": user_id, "speaker_name": user_name,
                        "language": data.get("language", "en"),
                        "original_text": manual_text, "text": manual_text,
                        "is_corrected": False,
                        "created_at": datetime.now(timezone.utc),
                    }},
                    upsert=True,
                )
                print(
                    f"[transcript-dispatch] chunk_id={chunk_id} "
                    f"speaker_id={user_id} speaker_name={user_name!r} "
                    f"source_language={data.get('language', 'en')} "
                    f"text={data.get('text')!r} "
                    f"recipients={transcript_recipients}"
                )

            # ==========================================
            # HUMAN TRANSCRIPT CORRECTION
            # ==========================================
            elif message_type == "correct_transcript":
                chunk_id = data.get("chunk_id")
                corrected_text = data.get("corrected_text")

                if not isinstance(chunk_id, str) or not chunk_id:
                    await manager.send_personal_message(
                        {"type": "correction_error", "chunk_id": chunk_id,
                         "reason": "A valid transcript identifier is required."},
                        meeting_id, user_id,
                    )
                    continue

                if not isinstance(corrected_text, str):
                    await manager.send_personal_message(
                        {"type": "correction_error", "chunk_id": chunk_id,
                         "reason": "Corrected text must be a string."},
                        meeting_id, user_id,
                    )
                    continue

                corrected_text = corrected_text.strip()
                if not corrected_text or len(corrected_text) > 2000:
                    await manager.send_personal_message(
                        {"type": "correction_error", "chunk_id": chunk_id,
                         "reason": "Corrected text must contain 1 to 2000 characters."},
                        meeting_id, user_id,
                    )
                    continue

                record = await transcripts_collection.find_one(
                    {"meeting_id": meeting_id, "chunk_id": chunk_id}
                )
                if not record:
                    await manager.send_personal_message(
                        {"type": "correction_error", "chunk_id": chunk_id,
                         "reason": "Transcript was not found."},
                        meeting_id, user_id,
                    )
                    continue

                speaker_id = str(record.get("speaker_id", ""))
                if speaker_id != str(user_id):
                    print(
                        f"[correction] denied chunk_id={chunk_id} "
                        f"current_user={user_id} speaker={speaker_id}"
                    )
                    await manager.send_personal_message(
                        {"type": "correction_error", "chunk_id": chunk_id,
                         "reason": "Only the original speaker can edit this transcript."},
                        meeting_id, user_id,
                    )
                    continue

                original_text = record.get("text", "")
                await transcripts_collection.update_one(
                    {"_id": record["_id"]},
                    {"$set": {
                        "text": corrected_text, "is_corrected": True,
                        "corrected_text": corrected_text, "corrected_by": user_id,
                    }},
                )

                correction_event = {
                    "type": "transcript_corrected", "chunk_id": chunk_id,
                    "user_id": speaker_id, "speaker_id": speaker_id,
                    "user_name": record.get("speaker_name", user_name),
                    "speaker_name": record.get("speaker_name", user_name),
                    "language": record.get("language", "en"),
                    "original_text": original_text, "corrected_text": corrected_text,
                    "text": corrected_text, "is_corrected": True,
                    "corrected_by": user_id,
                }
                await manager.broadcast(meeting_id, correction_event)
                print(
                    f"[correction] accepted chunk_id={chunk_id} speaker={speaker_id} "
                    f"text={corrected_text!r}"
                )

                correction_job = {
                    "chunk_id": chunk_id, "user_id": speaker_id,
                    "user_name": record.get("speaker_name", user_name),
                    "transcript": corrected_text,
                    "detected_language": record.get("language", "en"),
                    "whisper_confidence": 0, "audio_quality": 0,
                    "grammar_result": {"original_text": record.get("original_text", original_text)},
                    "grammar_modified": True,
                }
                if postprocess_queue.full():
                    dropped_job = postprocess_queue.get_nowait()
                    postprocess_queue.task_done()
                    print(f"[postprocess-drop] speaker={dropped_job['user_id']} chunk_id={dropped_job['chunk_id']}")
                postprocess_queue.put_nowait(correction_job)

            # ==========================================
            # TRANSLATION FEEDBACK
            # ==========================================
            elif message_type == "translation_feedback":
                await ai_feedback_service.update_human_translation(
                    feedback_id=data["feedback_id"],
                    human_translation=data["human_translation"]
                )
                await manager.broadcast(
                    meeting_id,
                    {
                        "type": "translation_feedback",
                        "feedback_id": data["feedback_id"],
                        "user_id": user_id,
                        "human_translation": data["human_translation"]
                    }
                )

            # ==========================================
            # MANUAL TRANSLATION
            # ==========================================
            elif message_type == "translation":
                # A translation is inherently recipient-specific. Never
                # broadcast a legacy/manual translation with no recipient;
                # doing so would leak one recipient's language to every UI.
                recipient_id = data.get("recipient_id")
                if not recipient_id:
                    print(
                        "[translation-routing] rejected manual translation: "
                        "missing recipient_id"
                    )
                    await manager.send_personal_message(
                        {
                            "type": "error",
                            "message": "Translation requires recipient_id.",
                        },
                        meeting_id,
                        user_id,
                    )
                    continue

                delivered = await manager.send_personal_message(
                    {
                        "type": "translation",
                        "chunk_id": data.get("chunk_id") or str(uuid4()),
                        "user_id": user_id,
                        "speaker_id": user_id,
                        "user_name": user_name,
                        "speaker_name": user_name,
                        "recipient_id": recipient_id,
                        "source_language": data.get("source_language"),
                        "target_language": data.get("target_language") or data.get("language"),
                        "text": data.get("text"),
                        "output_mode": data.get("output_mode", "subtitle"),
                        "is_subtitle": True,
                    },
                    meeting_id,
                    recipient_id,
                )
                print(
                    f"[translation-routing] manual speaker_id={user_id} "
                    f"recipient_id={recipient_id} delivered={delivered}"
                )

            # ==========================================
            # USER LEAVING
            # ==========================================
            elif message_type == "leave":
                disconnected = manager.disconnect(meeting_id, user_id, websocket)
                if disconnected:
                    print(
                        f"[USER-LEFT] meeting_id={meeting_id} user_id={user_id} "
                        f"reason=client_leave socket_instance_id={id(websocket)}"
                    )
                    await manager.broadcast(
                        meeting_id,
                        {
                            "type": "user_left",
                            "user_id": user_id,
                            "participants": manager.get_participants(meeting_id)
                        }
                    )
                break

    except WebSocketDisconnect:
        disconnected = manager.disconnect(meeting_id, user_id, websocket)
        if disconnected:
            print(
                f"[USER-LEFT] meeting_id={meeting_id} user_id={user_id} "
                f"reason=websocket_disconnect socket_instance_id={id(websocket)}"
            )
            await manager.broadcast(
                meeting_id,
                {
                    "type": "user_left",
                    "user_id": user_id,
                    "participants": manager.get_participants(meeting_id)
                }
            )

    except Exception as e:
        print(f"WebSocket Error: {e}")
        disconnected = manager.disconnect(meeting_id, user_id, websocket)
        if disconnected:
            print(
                f"[USER-LEFT] meeting_id={meeting_id} user_id={user_id} "
                f"reason=socket_exception socket_instance_id={id(websocket)}"
            )
            await manager.broadcast(
                meeting_id,
                {
                    "type": "user_left",
                    "user_id": user_id,
                    "participants": manager.get_participants(meeting_id)
                }
            )

    finally:
        # Stop the worker task cleanly so it doesn't leak once the
        # connection is gone.
        worker_task.cancel()
        try:
            await worker_task
        except asyncio.CancelledError:
            pass
        postprocess_task.cancel()
        try:
            await postprocess_task
        except asyncio.CancelledError:
            pass
