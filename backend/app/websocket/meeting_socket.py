import asyncio
from uuid import uuid4

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
from app.services.text_to_speech_service import text_to_speech_service

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
        "none", "subtitle", "voice", "subtitle_voice"
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
        chunk_id = str(uuid4())
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

        grammar_result = await asyncio.to_thread(
            grammar_correction_service.correct,
            transcript
        )
        transcript = grammar_result["corrected_text"]
        grammar_modified = grammar_result["modified"]

        # Deliver captions as soon as transcription and grammar cleanup
        # complete. Translation, feedback persistence, and quality scoring
        # continue below without delaying the live transcript UI.
        await manager.broadcast(
            meeting_id,
            {
                "type": "transcript",
                "chunk_id": chunk_id,
                "user_id": user_id,
                "user_name": data.get("user_name", "Participant"),
                "text": transcript,
                "language": detected_language,
                "confidence": whisper_confidence,
                "grammar_corrected": grammar_modified,
            }
        )

        speech_result = await asyncio.to_thread(
            speech_accuracy_service.analyze,
            transcript,
            whisper_confidence
        )
        speech_accuracy = speech_result["accuracy"]
        speech_status = speech_result["status"]

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
            {"_id": 0, "participants": 1, "output_mode": 1}
        )
        meeting_participants = (
            participants_doc.get("participants", [])
            if participants_doc else []
        )

        default_output_mode = _normalize_output_mode(
            (participants_doc or {}).get("output_mode", "none")
        )

        recipient_preferences = {}
        for participant in meeting_participants:
            recipient_id = participant.get("user_id")
            if not recipient_id:
                continue
            recipient_preferences[recipient_id] = {
                "preferred_language": participant.get(
                    "preferred_language",
                    participant.get("language", "English")
                ),
                "output_mode": _normalize_output_mode(
                    participant.get("output_mode", default_output_mode)
                ),
            }

        if user_id not in recipient_preferences:
            recipient_preferences[user_id] = {
                "preferred_language": "English",
                "output_mode": default_output_mode,
            }

        # Translate only for recipients who requested translated output.
        # Each unique target language is still translated once in parallel.
        unique_languages = list({
            preference["preferred_language"]
            for preference in recipient_preferences.values()
            if preference["output_mode"] != "none"
        })

        async def _translate_for(lang_name):
            target_lang_code = LANGUAGE_MAP.get(lang_name, "en")
            translation_result = await asyncio.to_thread(
                translation_service.translate,
                transcript,
                source_lang=detected_language,
                target_lang=target_lang_code
            )
            return lang_name, translation_result

        translation_pairs = await asyncio.gather(
            *[_translate_for(lang) for lang in unique_languages]
        )
        translated_by_language = dict(translation_pairs)

        speaker_language = recipient_preferences[user_id][
            "preferred_language"
        ]
        speaker_translation = translated_by_language.get(
            speaker_language,
            {"success": False},
        )
        canonical_translated_text = speaker_translation.get(
            "translated_text"
        ) or transcript

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

        for recipient_id, preference in recipient_preferences.items():
            recipient_language = preference["preferred_language"]
            recipient_output_mode = preference["output_mode"]

            if recipient_output_mode == "none":
                continue

            translation_result = translated_by_language.get(
                recipient_language,
                {"success": False, "reason": "translation_missing"},
            )

            if not translation_result.get("success"):
                print(
                    "Translation skipped for "
                    f"{recipient_id} ({recipient_language}): "
                    f"{translation_result.get('reason')}"
                )
                continue

            translated_text = translation_result["translated_text"]

            audio_url = None
            if recipient_output_mode in {"voice", "subtitle_voice"}:
                try:
                    tts_result = await text_to_speech_service.text_to_speech(
                        translated_text,
                        LANGUAGE_MAP.get(recipient_language, "en"),
                    )
                    if tts_result.get("success"):
                        audio_url = (
                            f"/generated_audio/{tts_result['filename']}"
                        )
                except Exception as error:
                    print(f"TTS delivery failed for {recipient_id}: {error}")

            await manager.send_personal_message(
                {
                    "type": "translation",
                    "chunk_id": chunk_id,
                    "user_id": user_id,
                    "source_language": detected_language,
                    "target_language": recipient_language,
                    "text": (
                        translated_text
                        if recipient_output_mode in {
                            "subtitle", "subtitle_voice"
                        }
                        else ""
                    ),
                    "audio_url": audio_url,
                    "output_mode": recipient_output_mode,
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
                # Preserve the authenticated meeting participant's display
                # name with the queued chunk so the transcript event can be
                # rendered without a second lookup in the hot path.
                data["user_name"] = user_name
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
                        "output_mode": _normalize_output_mode(
                            updated_participant.get("output_mode", "none")
                        ),
                    },
                )

            # ==========================================
            # MANUAL TRANSCRIPT
            # ==========================================
            elif message_type == "transcript":
                await manager.broadcast(
                    meeting_id,
                    {
                        "type": "transcript",
                        "chunk_id": str(uuid4()),
                        "user_id": user_id,
                        "user_name": user_name,
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
