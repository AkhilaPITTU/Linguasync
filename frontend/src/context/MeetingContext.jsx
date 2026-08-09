import { createContext, useCallback, useRef, useState } from "react";

import webrtcService from "../services/webrtcService";
import audioService from "../services/audioService";
import { leaveMeeting as leaveMeetingAPI } from "../services/meetingService";

import useSocket from "../hooks/useSocket";
import useWebRTC from "../hooks/useWebRTC";

export const MeetingContext = createContext();

// Owns everything a meeting room screen needs: joining the call,
// wiring WebRTC signaling to incoming socket events, and collecting
// chat/transcript/translation events as they stream in.
//
// This is the logic that used to live directly inside MeetingRoom.jsx -
// moving it here means any component in the tree can read meeting
// state via useMeeting(), instead of everything being passed down
// as props from one page.

export const MeetingProvider = ({ children }) => {

    const { connect, disconnect, send } = useSocket();

    const webrtc = useWebRTC();

    const [participants, setParticipants] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [transcript, setTranscript] = useState([]);
    const [translations, setTranslations] = useState([]);
    const [language, setLanguage] = useState("English");
    const [joined, setJoined] = useState(false);

    const meetingIdRef = useRef(null);
    const userIdRef = useRef(null);

    const upsertParticipant = useCallback((userId, patch) => {

        setParticipants((prev) => {

            const exists = prev.some((p) => p.id === userId);

            if (exists) {

                return prev.map((p) =>
                    p.id === userId ? { ...p, ...patch } : p
                );

            }

            return [
                ...prev,
                {
                    id: userId,
                    name: patch.name || "Participant",
                    local: false,
                    language: "English",
                    mic: true,
                    camera: true,
                    speaking: false,
                    ...patch,
                },
            ];

        });

    }, []);

    const handleSocketMessage = useCallback(async (data) => {

        switch (data.type) {

            case "user_joined":

                if (data.user_id !== userIdRef.current) {

                    // Show a tile immediately (avatar placeholder) so the
                    // UI doesn't look empty while the connection negotiates.
                    upsertParticipant(data.user_id, {});

                    await webrtcService.createPeerConnection(
                        data.user_id,
                        (fromUserId, stream) => {
                            upsertParticipant(fromUserId, { stream });
                        }
                    );

                    await webrtcService.createOffer(data.user_id);

                }

                break;

            case "offer":

                upsertParticipant(data.from, {});

                await webrtcService.createPeerConnection(
                    data.from,
                    (fromUserId, stream) => {
                        upsertParticipant(fromUserId, { stream });
                    }
                );

                await webrtcService.createAnswer(data.from, data.offer);

                break;

            case "answer":

                await webrtcService.setRemoteAnswer(data.from, data.answer);

                break;

            case "ice_candidate":

                await webrtcService.addIceCandidate(data.from, data.candidate);

                break;

            case "chat":

                setChatMessages((prev) => [...prev, data]);

                break;

            case "transcript":

                setTranscript((prev) => [...prev, data]);

                break;

            case "translation":

                setTranslations((prev) => [...prev, data]);

                break;

            case "user_left":

                setParticipants((prev) =>
                    prev.filter((p) => p.id !== data.user_id)
                );

                break;

            case "error":

                console.error("Meeting server error:", data.message);

                break;

            case "audio_warning":

                console.warn("Audio quality warning:", data.message);

                break;

            default:

                console.log(data);

        }

    }, [upsertParticipant]);

    const joinMeeting = useCallback(async (meetingId, userId, userName) => {

        meetingIdRef.current = meetingId;
        userIdRef.current = userId;

        const stream = await webrtc.startLocalStream();

        setParticipants([
            {
                id: userId,
                name: userName,
                stream,
                local: true,
                language,
                mic: true,
                camera: true,
                speaking: false,
            },
        ]);

        await connect(meetingId, userId, handleSocketMessage);

        // Small delay so the socket + peer plumbing above is
        // fully settled before we start streaming audio chunks.
        await new Promise((resolve) => setTimeout(resolve, 500));

        await audioService.startRecording((audioChunk) => {

            send({
                type: "audio_stream",
                meeting_id: meetingId,
                user_id: userId,
                language,
                audio: Array.from(new Uint8Array(audioChunk)),
            });

        });

        setJoined(true);

    }, [connect, handleSocketMessage, language, send, webrtc]);

    const leaveMeeting = useCallback(async () => {

        const meetingId = meetingIdRef.current;
        const userId = userIdRef.current;

        try {

            if (meetingId && userId) {
                await leaveMeetingAPI(meetingId, userId);
            }

        } catch (error) {

            console.error("Leave meeting error:", error);

        }

        audioService.stopRecording();

        disconnect();

        webrtc.endCall();

        setParticipants([]);
        setChatMessages([]);
        setTranscript([]);
        setTranslations([]);
        setJoined(false);

        meetingIdRef.current = null;
        userIdRef.current = null;

    }, [disconnect, webrtc]);

    const changeLanguage = useCallback((nextLanguage) => {

        setLanguage(nextLanguage);

        setParticipants((prev) =>
            prev.map((participant) =>
                participant.local
                    ? { ...participant, language: nextLanguage }
                    : participant
            )
        );

    }, []);

    return (
        <MeetingContext.Provider
            value={{
                joined,
                participants,
                chatMessages,
                transcript,
                translations,
                language,
                micOn: webrtc.micOn,
                cameraOn: webrtc.cameraOn,
                joinMeeting,
                leaveMeeting,
                setLanguage: changeLanguage,
                toggleMic: webrtc.toggleMic,
                toggleCamera: webrtc.toggleCamera,
            }}
        >
            {children}
        </MeetingContext.Provider>
    );

};