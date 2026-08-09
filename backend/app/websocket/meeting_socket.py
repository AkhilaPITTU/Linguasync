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


def _get_user_name(meeting: dict, user_id: str) -> str:
    """Look up a participant's display name from the meeting document."""
    for participant in meeting.get("participants", []):
        if participant.get("user_id") == user_id:
            return participant.get("user_name", "Participant")
    return "Participant"


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

    # Extract user name for the user who just joined
    user_name = _get_user_name(meeting, user_id)

    # Broadcast user_joined immediately after connection
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
            # Re-fetch the meeting doc here so we can attach the
            # sender's display name. The frontend was previously
            # falling back to a hardcoded "Participant" string
            # whenever it created a remote participant from an
            # "offer" message (rather than "user_joined"), because
            # this payload never carried a name.
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
            # NOTE: This branch used to call several blocking /
            # CPU-heavy functions (noise detection, Whisper
            # transcription, grammar correction, translation, etc.)
            # directly inside this async loop. Since this loop is
            # also responsible for immediately relaying "offer",
            # "answer", and "ice_candidate" messages for WebRTC
            # signaling, blocking here starved the event loop and
            # delayed/dropped that signaling traffic -- which is
            # what caused audio (and the periodic
            # "1011 keepalive ping timeout" disconnects) to break
            # even though ICE/video looked "connected". Every
            # blocking call below now runs via asyncio.to_thread so
            # the event loop stays free to service other messages
            # while transcription/translation work happens in a
            # worker thread.
            # ==========================================
            elif message_type == "audio_stream":
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
                        continue

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

                    # Determine target language safely
                    meeting_doc = await meetings_collection.find_one(
                        {"meeting_id": meeting_id},
                        {"_id": 0, "preferred_language": 1}
                    )

                    target_language = "English"
                    if meeting_doc:
                        target_language = meeting_doc.get("preferred_language", "English")

                    language_map = {
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

                    target_lang = language_map.get(target_language, "en")

                    translated_text = await asyncio.to_thread(
                        translation_service.translate,
                        transcript,
                        source_lang=detected_language,
                        target_lang=target_lang
                    )

                    feedback = await ai_feedback_service.save_feedback(
                        meeting_id=meeting_id,
                        user_id=user_id,
                        original_text=grammar_result["original_text"],
                        corrected_text=transcript,
                        translated_text=translated_text,
                        whisper_confidence=whisper_confidence,
                        audio_quality=audio_quality,
                        speech_accuracy=speech_accuracy,
                        overall_confidence=overall_confidence,
                        confidence_level=confidence_level,
                        review_required=review_required
                    )

                    # Broadcast speaking indicator
                    await manager.broadcast(
                        meeting_id,
                        {
                            "type": "speaking",
                            "user_id": user_id
                        }
                    )

                    # Broadcast transcript
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

                    # Broadcast translation
                    await manager.broadcast(
                        meeting_id,
                        {
                            "type": "translation",
                            "user_id": user_id,
                            "source_language": detected_language,
                            "target_language": target_language,
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
                        }
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
