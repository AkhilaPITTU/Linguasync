import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
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

router = APIRouter()

meetings_collection = database["meetings"]

LANGUAGE_MAP = {
    "English": "en",
    "Telugu": "te",
    "Hindi": "hi",
    "Tamil": "ta",
    "Kannada": "kn",
    "Malayalam": "ml",
    "French": "fr",
    "German": "de",
    "Spanish": "es"
}

# How many audio_stream chunks we'll let queue up per connection
# before we start dropping the oldest ones. This is a safety valve:
# if a client sends chunks faster than the AI pipeline can drain
# them (e.g. transcription is slow), we don't want unbounded memory
# growth or an ever-growing backlog of stale audio.
MAX_QUEUED_CHUNKS = 5


def _get_user_name(meeting: dict, user_id: str) -> str:
    """Look up a participant's display name from the meeting document."""
    for participant in meeting.get("participants", []):
        if participant.get("user_id") == user_id:
            return participant.get("user_name", "Participant")
    return "Participant"


async def _process_audio_chunk(meeting_id: str, user_id: str, data: dict):
    """
    Runs the full audio pipeline for a single chunk: noise check,
    transcription, grammar correction, confidence scoring, translation,
    and delivery. This is intentionally identical in logic to the
    original inline version -- it's just been moved into its own
    function so it can run from a background worker task instead of
    directly inside the message-receive loop.
    """
    try:
        audio_bytes = bytes(data.get("audio", []))

        noise_result = await asyncio.to_thread(
            noise_detection_service.analyze,
            audio_bytes
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

        transcript_result = await asyncio.to_thread(
            whisper_service.transcribe,
            audio_bytes
        )
        transcript = transcript_result.get("text", "")
        detected_language = transcript_result.get("language", "en")
        whisper_confidence = transcript_result.get("confidence", 0)

        speech_result = await asyncio.to_thread(
            speech_accuracy_service.analyze,
            transcript,
            whisper_confidence
        )
        speech_accuracy = speech_result["accuracy"]
        speech_status = speech_result["status"]

        grammar_result = await asyncio.to_thread(
            grammar_correction_service.correct,
            transcript
        )
        transcript = grammar_result["corrected_text"]
        grammar_modified = grammar_result["modified"]

        confidence_result = await asyncio.to_thread(
            confidence_service.calculate,
            whisper_confidence,
            audio_quality,
            speech_accuracy
        )
        overall_confidence = confidence_result["confidence"]
        confidence_level = confidence_result["level"]

        review_result = await asyncio.to_thread(
            human_review_service.evaluate,
            overall_confidence
        )
        review_required = review_result["review_required"]
        review_message = review_result["review_message"]

        # ------------------------------------------
        # Fetch each participant's own preferred
        # language for personalized subtitles.
        # ------------------------------------------
        participants_doc = await meetings_collection.find_one(
            {"meeting_id": meeting_id},
            {"_id": 0, "participants": 1}
        )
        meeting_participants = (
            participants_doc.get("participants", [])
            if participants_doc else []
        )

        recipient_languages = {}
        for participant in meeting_participants:
            recipient_id = participant.get("user_id")
            if not recipient_id:
                continue
            recipient_languages[recipient_id] = participant.get(
                "language", "English"
            )

        if user_id not in recipient_languages:
            recipient_languages[user_id] = "English"

        # Translate once per unique target language, in parallel
        # instead of one-at-a-time -- these calls are independent of
        # each other so there's no reason to serialize them.
        unique_languages = list(set(recipient_languages.values()))

        async def _translate_for(lang_name):
            target_lang_code = LANGUAGE_MAP.get(lang_name, "en")
            translated = await asyncio.to_thread(
                translation_service.translate,
                transcript,
                source_lang=detected_language,
                target_lang=target_lang_code
            )
            return lang_name, translated

        translation_pairs = await asyncio.gather(
            *[_translate_for(lang) for lang in unique_languages]
        )
        translated_by_language = dict(translation_pairs)

        speaker_language = recipient_languages.get(user_id, "English")
        canonical_translated_text = translated_by_language.get(
            speaker_language, transcript
        )

        feedback = await ai_feedback_service.save_feedback(
            meeting_id=meeting_id,
            user_id=user_id,
            original_text=grammar_result["original_text"],
            corrected_text=transcript,
            translated_text=canonical_translated_text,
            whisper_confidence=whisper_confidence,
            audio_quality=audio_quality,
            speech_accuracy=speech_accuracy,
            overall_confidence=overall_confidence,
            confidence_level=confidence_level,
            review_required=review_required
        )

        await manager.broadcast(
            meeting_id,
            {
                "type": "speaking",
                "user_id": user_id
            }
        )

        await manager.broadcast(
            meeting_id,
            {
                "type": "transcript",
                "user_id": user_id,
                "text": transcript,
                "language": detected_language,
                "confidence": whisper_confidence,
                "audio_quality": audio_quality,
                "speech_accuracy": speech_accuracy,
                "speech_status": speech_status,
                "grammar_corrected": grammar_modified,
                "overall_confidence": overall_confidence,
                "confidence_level": confidence_level,
                "review_required": review_required,
                "review_message": review_message
            }
        )

        for recipient_id, recipient_language in recipient_languages.items():
            translated_text = translated_by_language[recipient_language]

            await manager.send_personal_message(
                {
                    "type": "translation",
                    "user_id": user_id,
                    "source_language": detected_language,
                    "target_language": recipient_language,
                    "text": translated_text,
                    "feedback_id": str(feedback["_id"]) if feedback else None,
                    "confidence": whisper_confidence,
                    "audio_quality": audio_quality,
                    "speech_accuracy": speech_accuracy,
                    "speech_status": speech_status,
                    "grammar_corrected": grammar_modified,
                    "overall_confidence": overall_confidence,
                    "confidence_level": confidence_level,
                    "review_required": review_required,
                    "review_message": review_message,
                },
                meeting_id,
                recipient_id
            )

    except Exception as e:
        await manager.send_personal_message(
            {
                "type": "error",
                "message": str(e)
            },
            meeting_id,
            user_id
        )


async def _audio_worker(meeting_id: str, user_id: str, queue: "asyncio.Queue[dict]"):
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
            await _process_audio_chunk(meeting_id, user_id, data)
        finally:
            queue.task_done()


# =====================================================
# MEETING WEBSOCKET
# =====================================================

@router.websocket("/ws/meeting/{meeting_id}/{user_id}")
async def meeting_socket(
    websocket: WebSocket,
    meeting_id: str,
    user_id: str
):

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

    user_name = _get_user_name(meeting, user_id)

    print("\n========== WEBSOCKET JOIN ==========")
    print("Meeting:", meeting_id)
    print("Connected Users:", manager.get_participants(meeting_id))
    print("Broadcast User:", user_id)
    await manager.broadcast(
        meeting_id,
        {
            "type": "user_joined",
            "user_id": user_id,
            "user_name": user_name,
            "participants": manager.get_participants(meeting_id)
        }
    )

    # Bounded queue + dedicated worker task for this connection's
    # audio chunks. maxsize enforces MAX_QUEUED_CHUNKS; when full we
    # drop the oldest queued chunk rather than blocking the receive
    # loop or growing memory unboundedly.
    audio_queue: "asyncio.Queue[dict]" = asyncio.Queue(maxsize=MAX_QUEUED_CHUNKS)
    worker_task = asyncio.create_task(
        _audio_worker(meeting_id, user_id, audio_queue)
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

                await manager.send_personal_message(
                    {
                        "type": "offer",
                        "from": user_id,
                        "user_name": sender_name,
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

                await manager.send_personal_message(
                    {
                        "type": "answer",
                        "from": user_id,
                        "user_name": sender_name,
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
                if audio_queue.full():
                    # Drop the oldest queued chunk to make room. We
                    # care about keeping up with live speech, not
                    # about processing every single chunk ever sent.
                    try:
                        audio_queue.get_nowait()
                        audio_queue.task_done()
                    except asyncio.QueueEmpty:
                        pass

                await audio_queue.put(data)

            # ==========================================
            # MANUAL TRANSCRIPT
            # ==========================================
            elif message_type == "transcript":
                await manager.broadcast(
                    meeting_id,
                    {
                        "type": "transcript",
                        "user_id": user_id,
                        "text": data.get("text"),
                        "language": data.get("language", "en")
                    }
                )

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
                await manager.broadcast(
                    meeting_id,
                    {
                        "type": "translation",
                        "user_id": user_id,
                        "target_language": data.get("language"),
                        "text": data.get("text")
                    }
                )

            # ==========================================
            # USER LEAVING
            # ==========================================
            elif message_type == "leave":
                manager.disconnect(meeting_id, user_id)
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
        manager.disconnect(meeting_id, user_id)
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
        manager.disconnect(meeting_id, user_id)
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