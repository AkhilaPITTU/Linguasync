import "./MeetingRoom.css";
import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

import {
    joinMeeting,
    getMeeting
} from "../services/meetingService";

import VideoGrid from "../components/meeting/VideoGrid";
import RightSidebar from "../components/meeting/RightSidebar";
import BottomControls from "../components/meeting/BottomControls";
import ShowUIButton from "../components/meeting/ShowUIButton";
import AddParticipants from "./AddParticipants";

import websocketService from "../services/websocketService";
import webrtcService from "../services/webrtcService";
import audioService from "../services/audioService";
import { API_BASE_URL } from "../services/apiConfig";
import { getLanguageCode } from "../components/meeting/languageCode";

// Minimum time between audio_stream sends
const AUDIO_SEND_INTERVAL_MS = 1000;

// Translated voice/TTS output has been removed entirely: the original
// speaker's audio is always preserved via WebRTC, and translation only
// ever applies to the text/subtitle layer. Legacy voice-related aliases
// are therefore mapped onto "subtitle" instead of a voice mode.
const legacyOutputModeToPreference = (mode) => {

    if (
        ["none", "transcription", "subtitle"]
            .includes(mode)
    ) {
        return mode;
    }

    const modes = {
        original: "none",
        text: "subtitle",
        speech: "subtitle",
        translated_speech: "subtitle",
        text_speech: "subtitle",
    };

    return modes[mode] || "none";
};

const MeetingRoom = () => {

    const { meetingId } = useParams();

    const location = useLocation();

    const joinPreferences =
        location.state?.joinPreferences;

    // ==========================================
    // USER
    // ==========================================

    const rawUserId =
        localStorage.getItem("user_id") || "";

    const userId =
        rawUserId.includes(":")
            ? rawUserId.split(":")[0].trim()
            : rawUserId.trim();

    const userName =
        localStorage.getItem("user_name") ||
        "Participant";

    // ==========================================
    // STATE
    // ==========================================

    const [participants, setParticipants] = useState([]);

    const [chatMessages, setChatMessages] = useState([]);

    const [transcript, setTranscript] = useState([]);

    const [translations, setTranslations] = useState([]);

    const defaultLanguage =
        joinPreferences?.preferred_language ||
        "English";

    const [language, setLanguage] =
        useState(defaultLanguage);

    const [outputMode, setOutputMode] =
        useState(
            joinPreferences?.output_mode ||
            "none"
        );

    const [meetingType, setMeetingType] =
        useState("video");

    const [showAddParticipants, setShowAddParticipants] =
        useState(false);

    const [mediaError, setMediaError] = useState("");

    const [microphoneMuted, setMicrophoneMuted] = useState(false);

    const microphoneMutedRef = useRef(false);

    // Prevent delayed work from an old mount from changing the recorder used
    // by the current meeting (especially in React Strict Mode).
    const meetingSessionRef = useRef(0);

    const [remoteAudioMuted, setRemoteAudioMuted] = useState(false);

    const [isMeetingHost, setIsMeetingHost] = useState(false);

    const subtitleTimeoutsRef =
        useRef({});

    const lastAudioSentAtRef =
        useRef(0);

    const sentAudioChunkCountRef =
        useRef(0);

    const pendingTranscriptCorrectionsRef = useRef({});

    const correctTranscript = (item, correctedText) => {
        pendingTranscriptCorrectionsRef.current[item.chunk_id] = item.text;
        setTranscript((prev) => prev.map((entry) =>
            entry.chunk_id === item.chunk_id
                ? { ...entry, text: correctedText, is_corrected: true }
                : entry
        ));
        websocketService.send({
            type: "correct_transcript",
            chunk_id: item.chunk_id,
            corrected_text: correctedText,
        });
    };

    const saveMeetingPreferences = async ({
        preferred_language,
        source_language,
        output_mode,
    }) => {

        await joinMeeting(
            meetingId,
            userName,
            preferred_language,
            output_mode,
            source_language || getLanguageCode(preferred_language)
        );

        setLanguage(preferred_language);
        setOutputMode(output_mode);
        setParticipants(
            (prev) => prev.map(
                (participant) => participant.local
                    ? {
                        ...participant,
                        language: preferred_language,
                    }
                    : participant
            )
        );

        websocketService.send({
            type: "participant_preferences",
            preferred_language,
            source_language: source_language || getLanguageCode(preferred_language),
            output_mode,
        });
    };

    // ==========================================
    // INITIALIZE MEETING
    // ==========================================

    useEffect(() => {

        if (!userId) {

            console.error(
                "Initialization aborted: Missing user_id in localStorage."
            );

            return;
        }

        let mounted = true;
        const meetingSession = ++meetingSessionRef.current;
        const isCurrentSession = () => (
            mounted && meetingSessionRef.current === meetingSession
        );

        const initializeMeeting = async () => {

            try {

                console.log(
                    "===================================="
                );

                console.log(
                    "INITIALIZING MEETING"
                );

                console.log(
                    "Meeting ID:",
                    meetingId
                );

                console.log(
                    "User ID:",
                    userId
                );

                // ==========================================
                // 1. GET MEETING DETAILS
                // ==========================================

                const meetingResponse =
                    await getMeeting(meetingId);

                console.log(
                    "Meeting Details:",
                    meetingResponse
                );

                /*
                 * Your backend may return:
                 *
                 * {
                 *   success: true,
                 *   meeting: {
                 *      meeting_type: "audio"
                 *   }
                 * }
                 *
                 * or directly:
                 *
                 * {
                 *   meeting_type: "audio"
                 * }
                 */

                const meeting =
                    meetingResponse?.meeting ||
                    meetingResponse?.data ||
                    meetingResponse;

                const currentMeetingType =
                    (
                        meeting?.meeting_type ||
                        meeting?.type ||
                        "video"
                    ).toLowerCase();

                const isAudioMeeting =
                    currentMeetingType === "audio";

                const isVideoMeeting =
                    !isAudioMeeting;

                const savedParticipant =
                    meeting?.participants?.find(
                        (participant) =>
                            participant.user_id === userId
                    );

                const participantLanguage =
                    joinPreferences?.preferred_language ||
                    savedParticipant?.preferred_language ||
                    savedParticipant?.language ||
                    defaultLanguage;

                const participantOutputMode =
                    joinPreferences?.output_mode ||
                    legacyOutputModeToPreference(
                        savedParticipant?.output_mode ||
                        "none"
                    );
                const participantSourceLanguage =
                    getLanguageCode(participantLanguage);

                console.log(
                    "===================================="
                );

                console.log(
                    "MEETING TYPE:",
                    currentMeetingType
                );

                console.log(
                    "AUDIO MEETING:",
                    isAudioMeeting
                );

                console.log(
                    "VIDEO MEETING:",
                    isVideoMeeting
                );

                console.log(
                    "===================================="
                );

                if (!isCurrentSession()) return;

                setIsMeetingHost(String(meeting?.host_id || "") === String(userId));

                setMeetingType(
                    currentMeetingType
                );
                setLanguage(participantLanguage);

                console.log("[ASR-LANGUAGE-TRACE]", {
                    stage: "frontend_selected_language",
                    preferredLanguage: participantLanguage,
                    sourceLanguage: participantSourceLanguage,
                });

                // ==========================================
                // 2. START CORRECT MEDIA
                // ==========================================

                /*
                 * AUDIO CALL:
                 *
                 * video = false
                 * audio = true
                 *
                 * VIDEO CALL:
                 *
                 * video = true
                 * audio = true
                 */

                let stream;

                try {
                    stream = await webrtcService.startLocalStream(
                        isVideoMeeting,
                        true
                    );
                } catch (error) {
                    const message = error?.message ||
                        "Camera and microphone are unavailable. Please use HTTPS/localhost and allow browser permissions.";
                    console.error("Meeting media initialization failed:", message);
                    setMediaError(message);
                    return;
                }

                if (!isCurrentSession()) return;

                console.log(
                    "Local Stream Started"
                );

                console.log(
                    "Audio Tracks:",
                    stream.getAudioTracks().length
                );

                console.log(
                    "Video Tracks:",
                    stream.getVideoTracks().length
                );

                const initialMicrophoneMuted = !stream.getAudioTracks().some(
                    (track) => track.readyState === "live" && track.enabled
                );
                microphoneMutedRef.current = initialMicrophoneMuted;
                setMicrophoneMuted(initialMicrophoneMuted);

                // ==========================================
                // 3. LOCAL PARTICIPANT
                // ==========================================

                setParticipants([
                    {
                        id: userId,
                        name: userName,
                        stream,

                        local: true,

                        language: participantLanguage,

                        mic:
                            !initialMicrophoneMuted,

                        camera:
                            isVideoMeeting &&
                            stream.getVideoTracks().length > 0,

                        speaking: false
                    }
                ]);

                // ==========================================
                // 4. JOIN MEETING
                // ==========================================

                await joinMeeting(
                    meetingId,
                    userName,
                    participantLanguage,
                    participantOutputMode,
                    getLanguageCode(participantLanguage)
                );

                if (!isCurrentSession()) return;

                // ==========================================
                // 5. KNOWN PARTICIPANT NAMES
                // ==========================================

                const knownNames = {};

                // ==========================================
                // PARTICIPANT UPSERT
                // ==========================================

                const upsertParticipant =
                    (remoteUserId, updates) => {

                        setParticipants((prev) => {

                            const exists =
                                prev.find(
                                    (p) =>
                                        p.id === remoteUserId
                                );

                            if (exists) {

                                return prev.map(
                                    (p) =>
                                        p.id === remoteUserId
                                            ? {
                                                ...p,
                                                ...updates
                                            }
                                            : p
                                );
                            }

                            return [
                                ...prev,

                                {
                                    id: remoteUserId,

                                    name:
                                        updates.name ||
                                        knownNames[
                                            remoteUserId
                                        ] ||
                                        "Participant",

                                    stream:
                                        updates.stream ||
                                        null,

                                    local: false,

                                    language:
                                        updates.language ||
                                        "English",

                                    outputMode:
                                        updates.outputMode ||
                                        "none",

                                    mic: true,

                                    camera:
                                        isVideoMeeting,

                                    speaking: false,

                                    ...updates
                                }
                            ];
                        });
                    };

                const connectToParticipant = async (remoteUserId) => {

                    if (
                        remoteUserId === userId ||
                        webrtcService.hasPeerConnection(remoteUserId)
                    ) {
                        return;
                    }

                    console.log("Connecting to participant:", remoteUserId);

                    await webrtcService.createPeerConnection(
                        remoteUserId,
                        (peerUserId, remoteStream) => {
                            console.log("Remote stream received:", peerUserId);

                            upsertParticipant(peerUserId, {
                                stream: remoteStream,
                                camera:
                                    isVideoMeeting &&
                                    remoteStream.getVideoTracks().length > 0,
                            });
                        }
                    );

                    await webrtcService.createOffer(remoteUserId);
                };

                // ==========================================
                // 6. WEBSOCKET
                // ==========================================

                await websocketService.connect(
                    meetingId,
                    userId,
                    async (data) => {

                        switch (data.type) {

                            // ==================================
                            // USER JOINED
                            // ==================================

                            case "user_joined": {

                                console.log("[PARTICIPANTS]", {
                                    joined: data.user_id,
                                    serverParticipants: (data.participants || []).map(
                                        (participant) => participant.user_id
                                    ),
                                });

                                console.log(
                                    "========== USER JOINED =========="
                                );

                                console.log(
                                    "Current User:",
                                    userId
                                );

                                console.log(
                                    "Joined User:",
                                    data.user_id
                                );

                                console.log(
                                    "Data:",
                                    data
                                );

                                (data.participants || []).forEach(
                                    (participant) => {
                                        if (participant.user_name) {
                                            knownNames[participant.user_id] =
                                                participant.user_name;
                                        }

                                        upsertParticipant(
                                            participant.user_id,
                                            {
                                                name: participant.user_name,
                                                language:
                                                    participant.preferred_language,
                                                outputMode:
                                                    participant.output_mode,
                                            }
                                        );
                                    }
                                );

                                if (data.user_name) {

                                    knownNames[
                                        data.user_id
                                    ] =
                                        data.user_name;

                                    setParticipants(
                                        (prev) =>
                                            prev.map(
                                                (p) =>
                                                    p.id ===
                                                    data.user_id
                                                        ? {
                                                            ...p,
                                                            name:
                                                                data.user_name,
                                                            language:
                                                                data.preferred_language ||
                                                                p.language,
                                                            outputMode:
                                                                data.output_mode ||
                                                                p.outputMode,
                                                        }
                                                        : p
                                            )
                                    );
                                }

                                if (data.user_id !== userId) {

                                    // One deterministic offerer per pair
                                    // prevents offer glare when several
                                    // participants join or reconnect together.
                                    if (userId < data.user_id) {
                                        await connectToParticipant(data.user_id);
                                    }

                                } else {

                                    // On a reconnect, create only the missing
                                    // connections for which this browser is
                                    // the deterministic offerer.
                                    for (const participant of data.participants || []) {
                                        if (
                                            participant.user_id !== userId &&
                                            userId < participant.user_id
                                        ) {
                                            await connectToParticipant(
                                                participant.user_id
                                            );
                                        }
                                    }
                                }

                                break;
                            }

                            // ==================================
                            // OFFER
                            // ==================================

                            case "offer": {

                                console.log(
                                    "Received OFFER from:",
                                    data.from
                                );

                                if (data.user_name) {

                                    knownNames[
                                        data.from
                                    ] =
                                        data.user_name;
                                }

                                await webrtcService
                                    .createPeerConnection(
                                        data.from,

                                        (
                                            remoteUserId,
                                            remoteStream
                                        ) => {

                                            console.log(
                                                "Remote Stream From:",
                                                remoteUserId
                                            );

                                            upsertParticipant(
                                                remoteUserId,
                                                {
                                                    stream:
                                                        remoteStream,

                                                    camera:
                                                        isVideoMeeting &&
                                                        remoteStream
                                                            .getVideoTracks()
                                                            .length >
                                                            0
                                                }
                                            );
                                        }
                                    );

                                upsertParticipant(
                                    data.from,
                                    {
                                        name:
                                            data.user_name ||
                                            knownNames[
                                                data.from
                                            ] ||
                                            "Participant",

                                        camera:
                                            isVideoMeeting,

                                        language:
                                            data.preferred_language ||
                                            "Unknown",

                                        outputMode:
                                            data.output_mode ||
                                            "none",
                                    }
                                );

                                await webrtcService
                                    .createAnswer(
                                        data.from,
                                        data.offer
                                    );

                                break;
                            }

                            // ==================================
                            // ANSWER
                            // ==================================

                            case "answer": {

                                console.log(
                                    "Received ANSWER from:",
                                    data.from
                                );

                                if (data.user_name) {

                                    knownNames[
                                        data.from
                                    ] =
                                        data.user_name;

                                    upsertParticipant(
                                        data.from,
                                        {
                                            name:
                                                data.user_name,

                                            camera:
                                                isVideoMeeting,

                                            language:
                                                data.preferred_language ||
                                                "Unknown",

                                            outputMode:
                                                data.output_mode ||
                                                "none",
                                        }
                                    );
                                }

                                await webrtcService
                                    .setRemoteAnswer(
                                        data.from,
                                        data.answer
                                    );

                                break;
                            }

                            // ==================================
                            // PARTICIPANT PREFERENCE UPDATE
                            // ==================================

                            case "participant_preferences": {

                                setParticipants((prev) => prev.map(
                                    (participant) =>
                                        participant.id === data.user_id
                                            ? {
                                                ...participant,
                                                name:
                                                    data.user_name ||
                                                    participant.name,
                                                language:
                                                    data.preferred_language ||
                                                    participant.language,
                                                outputMode:
                                                    data.output_mode ||
                                                    participant.outputMode,
                                            }
                                            : participant
                                ));

                                break;
                            }

                            // ==================================
                            // ICE CANDIDATE
                            // ==================================

                            case "ice_candidate": {

                                console.log(
                                    "Received ICE Candidate from:",
                                    data.from
                                );

                                await webrtcService
                                    .addIceCandidate(
                                        data.from,
                                        data.candidate
                                    );

                                break;
                            }

                            // ==================================
                            // CHAT
                            // ==================================

                            case "chat": {

                                setChatMessages(
                                    (prev) => [
                                        ...prev,
                                        data
                                    ]
                                );

                                break;
                            }

                            // ==================================
                            // TRANSCRIPT
                            // ==================================

                            case "transcript": {

                                if (
                                    typeof data.text !== "string" ||
                                    !data.text.trim()
                                ) {

                                    console.log(
                                        "Transcript event ignored: empty text."
                                    );

                                    break;
                                }

                                console.log("[transcript-received]", {
                                    currentUserId: userId,
                                    chunk_id: data.chunk_id,
                                    speaker_id:
                                        data.speaker_id || data.user_id,
                                    speaker_name:
                                        data.speaker_name || data.user_name,
                                    language: data.language,
                                    confidence: data.confidence,
                                    text: data.text,
                                });

                                setTranscript(
                                    (prev) => {

                                        const next = [...prev, data];

                                        console.log("[transcript-state]", {
                                            currentUserId: userId,
                                            previous_count: prev.length,
                                            new_count: next.length,
                                            chunk_id: data.chunk_id,
                                        });

                                        return next;
                                    }
                                );

                                break;
                            }

                            // ==================================
                            // TRANSLATION
                            // ==================================

                            case "translation": {

                                console.log("[SUBTITLE-CLIENT] incoming", {
                                    currentUserId: userId,
                                    recipientId: data.recipient_id,
                                    speakerId: data.speaker_id || data.user_id,
                                    targetLanguage: data.target_language,
                                    isSubtitle: data.is_subtitle,
                                    accepted: data.recipient_id === userId,
                                });

                                // Translation events are sent privately by
                                // the backend. Keep this guard so a future
                                // broadcast cannot show another recipient's
                                // language on this client's subtitle UI.
                                if (data.recipient_id !== userId) {

                                    console.warn(
                                        "Translation event rejected: recipient mismatch or missing recipient_id.",
                                        {
                                            chunkId: data.chunk_id,
                                            recipientId: data.recipient_id,
                                            currentUserId: userId,
                                        }
                                    );

                                    break;
                                }

                                console.log("[translation-received]", {
                                    chunkId: data.chunk_id,
                                    speakerId: data.speaker_id || data.user_id,
                                    recipientId: data.recipient_id,
                                    accepted: true,
                                    sourceLanguage: data.source_language,
                                    targetLanguage: data.target_language,
                                    outputMode: data.output_mode,
                                    isSubtitle: data.is_subtitle,
                                    text: data.text,
                                });

                                setTranslations(
                                    (prev) => {

                                        const existingIndex = prev.findIndex(
                                            (entry) =>
                                                entry.chunk_id === data.chunk_id &&
                                                entry.recipient_id === data.recipient_id
                                        );

                                        if (existingIndex === -1) {
                                            const next = [...prev, data];
                                            console.log("[SUBTITLE-CLIENT] state", {
                                                currentUserId: userId,
                                                chunkId: data.chunk_id,
                                                recipientId: data.recipient_id,
                                                translationsLength: next.length,
                                                action: "append",
                                            });
                                            return next;
                                        }

                                        const next = prev.map((entry, index) =>
                                            index === existingIndex ? data : entry
                                        );
                                        console.log("[SUBTITLE-CLIENT] state", {
                                            currentUserId: userId,
                                            chunkId: data.chunk_id,
                                            recipientId: data.recipient_id,
                                            translationsLength: next.length,
                                            action: "replace",
                                        });
                                        return next;
                                    }
                                );

                                if (data.text) {

                                    console.log("[SUBTITLE]", {
                                        chunkId: data.chunk_id,
                                        speakerId:
                                            data.speaker_id || data.user_id,
                                        recipientId: data.recipient_id,
                                        targetLanguage:
                                            data.target_language,
                                        text: data.text,
                                    });

                                    setParticipants(
                                        (prev) =>
                                            prev.map(
                                                (p) =>
                                                    p.id ===
                                                    (data.speaker_id || data.user_id)
                                                        ? {
                                                            ...p,
                                                            subtitle:
                                                                data.text
                                                        }
                                                        : p
                                            )
                                    );

                                    if (
                                        subtitleTimeoutsRef
                                            .current[
                                            (data.speaker_id || data.user_id)
                                        ]
                                    ) {

                                        clearTimeout(
                                            subtitleTimeoutsRef
                                                .current[
                                                (data.speaker_id || data.user_id)
                                            ]
                                        );
                                    }

                                    subtitleTimeoutsRef
                                        .current[
                                        (data.speaker_id || data.user_id)
                                    ] =
                                        setTimeout(
                                            () => {

                                                setParticipants(
                                                    (prev) =>
                                                        prev.map(
                                                            (p) =>
                                                                p.id ===
                                                                (data.speaker_id || data.user_id)
                                                                    ? {
                                                                        ...p,
                                                                        subtitle:
                                                                            ""
                                                                    }
                                                                    : p
                                                        )
                                                );
                                            },
                                            5000
                                        );
                                }

                                // Translated voice/TTS is never generated or played back:
                                // the original speaker's audio is always preserved via
                                // WebRTC, and translation applies only to subtitles.

                                break;
                            }

                            case "conversation_flush_complete": {

                                console.log("[conversation-save] flush confirmed", {
                                    meetingId: data.meeting_id,
                                    flushed: data.flushed,
                                });

                                break;
                            }

                            // ==================================
                            // TRANSCRIPT CORRECTION
                            // ==================================

                            case "transcript_corrected": {

                                setTranscript((prev) => prev.map((entry) =>
                                    entry.chunk_id === data.chunk_id
                                        ? {
                                            ...entry,
                                            ...data,
                                            text: data.corrected_text,
                                            is_corrected: true,
                                        }
                                        : entry
                                ));
                                delete pendingTranscriptCorrectionsRef.current[
                                    data.chunk_id
                                ];
                                break;
                            }

                            case "correction_error": {

                                const originalText =
                                    pendingTranscriptCorrectionsRef.current[
                                        data.chunk_id
                                    ];
                                if (originalText !== undefined) {
                                    setTranscript((prev) => prev.map((entry) =>
                                        entry.chunk_id === data.chunk_id
                                            ? {
                                                ...entry,
                                                text: originalText,
                                                is_corrected: false,
                                            }
                                            : entry
                                    ));
                                    delete pendingTranscriptCorrectionsRef.current[
                                        data.chunk_id
                                    ];
                                }
                                console.error("Transcript correction rejected:", data.reason);
                                break;
                            }

                            // ==================================
                            // SPEAKING
                            // ==================================

                            case "speaking": {

                                setParticipants(
                                    (prev) =>
                                        prev.map(
                                            (participant) =>
                                                participant.id ===
                                                data.user_id
                                                    ? {
                                                        ...participant,
                                                        speaking:
                                                            true
                                                    }
                                                    : participant
                                        )
                                );

                                setTimeout(
                                    () => {

                                        setParticipants(
                                            (prev) =>
                                                prev.map(
                                                    (participant) =>
                                                        participant.id ===
                                                        data.user_id
                                                            ? {
                                                                ...participant,
                                                                speaking:
                                                                    false
                                                            }
                                                            : participant
                                                )
                                        );
                                    },
                                    1000
                                );

                                break;
                            }

                            // ==================================
                            // USER LEFT
                            // ==================================

                            case "user_left": {

                                console.log("[USER-LEFT]", { user: data.user_id });

                                console.log(
                                    "Participant left:",
                                    data.user_id
                                );

                                webrtcService
                                    .closePeerConnection(
                                        data.user_id
                                    );

                                setParticipants(
                                    (prev) =>
                                        prev.filter(
                                            (p) =>
                                                p.id !==
                                                data.user_id
                                        )
                                );

                                break;
                            }

                            default:

                                console.log(
                                    "Unhandled websocket message:",
                                    data
                                );
                        }
                    }
                );

                // ==========================================
                // 7. START AUDIO RECORDING
                // ==========================================

                await new Promise(
                    (resolve) =>
                        setTimeout(
                            resolve,
                            500
                        )
                );

                if (!isCurrentSession()) return;

                await audioService.startRecording(
                    (audioChunk) => {

                        if (microphoneMutedRef.current) {
                            console.log("[MIC-DEBUG] audio chunk ignored while muted");
                            return;
                        }

                        const now =
                            Date.now();

                        if (
                            now -
                            lastAudioSentAtRef
                                .current <
                            AUDIO_SEND_INTERVAL_MS
                        ) {

                            return;
                        }

                        if (
                            websocketService.socket &&
                            websocketService.socket
                                .readyState ===
                                WebSocket.OPEN
                        ) {

                            lastAudioSentAtRef
                                .current =
                                now;

                            sentAudioChunkCountRef.current += 1;

                            if (
                                sentAudioChunkCountRef.current === 1 ||
                                sentAudioChunkCountRef.current % 5 === 0
                            ) {
                                console.log("Audio chunk sent:", {
                                    number:
                                        sentAudioChunkCountRef.current,
                                    bytes: audioChunk.byteLength,
                                    preferredLanguage: participantLanguage,
                                    sourceLanguage: participantSourceLanguage,
                                });
                            }

                            websocketService.send(
                                {
                                    type:
                                        "audio_stream",

                                    meeting_id:
                                        meetingId,

                                    user_id:
                                        userId,

                                    source_language:
                                        participantSourceLanguage,

                                    audio:
                                        Array.from(
                                            new Uint8Array(
                                                audioChunk
                                            )
                                    )
                                }
                            );
                        } else {

                            console.warn(
                                "Audio chunk not sent: WebSocket is not open."
                            );
                        }
                    },
                    stream
                );

                if (microphoneMutedRef.current) {
                    audioService.setMuted(true);
                }

            } catch (error) {

                console.error(
                    "Meeting initialization failed:",
                    error
                );
            }
        };

        initializeMeeting();

        // ==========================================
        // CLEANUP
        // ==========================================

        return () => {

            mounted = false;

            audioService.stopRecording("MeetingRoom cleanup");

            websocketService.disconnect();

            // Also clear the service's localStream reference. Otherwise a
            // later join could reuse the stopped tracks from this meeting.
            webrtcService.closeConnection();

            Object.values(
                subtitleTimeoutsRef.current
            ).forEach(
                (timeoutId) => {
                    clearTimeout(timeoutId);
                }
            );

            if (
                webrtcService.localStream
            ) {

                webrtcService.localStream
                    .getTracks()
                    .forEach(
                        (track) =>
                            track.stop()
                    );
            }
        };

    }, [
        meetingId,
        userId,
        userName,
        joinPreferences?.preferred_language,
        joinPreferences?.output_mode,
    ]);

    // ==========================================
    // UI
    // ==========================================

    return (

        <div className="meeting-room">

            <header className="meeting-header">

                <div className="meeting-logo">

                    <div className="logo-circle">
                        🌐
                    </div>

                    <h2>
                        LINGUASYNC
                    </h2>

                </div>

                <div className="focus-mode">

                    <span className="status-dot"></span>

                    <span>
                        {meetingType === "audio"
                            ? "Voice Call"
                            : "Video Call"}
                    </span>

                </div>

                <ShowUIButton />

            </header>

            {mediaError && (
                <div className="meeting-media-error" role="alert">
                    {mediaError}
                </div>
            )}

            <main className="meeting-main">

                <section className="meeting-left">

                    <VideoGrid
                        participants={
                            participants
                        }
                        remoteAudioMuted={remoteAudioMuted}
                    />

                </section>

                <aside className="meeting-right">

                    <RightSidebar
                        participants={
                            participants
                        }

                        transcript={
                            transcript
                        }

                        translations={
                            translations
                        }

                        currentUserId={userId}

                        onCorrectTranscript={correctTranscript}

                        chatMessages={
                            chatMessages
                        }

                        language={
                            language
                        }

                        setLanguage={
                            setLanguage
                        }

                        outputMode={
                            outputMode
                        }

                        onPreferencesSave={
                            saveMeetingPreferences
                        }

                    />

                </aside>

            </main>

            <BottomControls
                participants={
                    participants
                }

                transcript={transcript}

                translations={translations}

                preferredLanguage={language}

                currentUserId={userId}

                microphoneMuted={microphoneMuted}

                speakerMuted={remoteAudioMuted}

                isMeetingHost={isMeetingHost}

                onBeforeLeave={async () => {
                    // Stop accepting fresh mic samples, then let the active
                    // recorder flush its final complete chunk before asking
                    // the backend to drain STT/translation work.
                    webrtcService.setMicrophoneMuted(true);
                    // Keep the recorder callback eligible until stopRecording
                    // delivers its already-captured final chunk. The track is
                    // disabled above, so no new microphone speech is added.
                    await audioService.stopRecording("meeting leave flush");
                    return websocketService.flushConversation();
                }}

                onMicrophoneChange={(enabled) => {
                    const result = webrtcService.setMicrophoneMuted(!enabled);

                    if (!result.changed) {
                        return;
                    }

                    const { muted } = result;
                    microphoneMutedRef.current = muted;
                    audioService.setMuted(muted);
                    setMicrophoneMuted(muted);
                    setParticipants((previous) => previous.map((participant) => (
                        participant.local ? { ...participant, mic: !muted } : participant
                    )));
                    websocketService.send({
                        type: "microphone_state",
                        muted,
                    });
                }}

                onSpeakerChange={(enabled) => {
                    setRemoteAudioMuted(!enabled);
                }}

                meetingId={
                    meetingId
                }

                userId={
                    userId
                }

                language={
                    language
                }

                onAddParticipants={() =>
                    setShowAddParticipants(
                        true
                    )
                }

            />

            {showAddParticipants && (

                <AddParticipants
                    meetingId={
                        meetingId
                    }

                    onClose={() =>
                        setShowAddParticipants(
                            false
                        )
                    }
                />

            )}

        </div>
    );
};

export default MeetingRoom;
