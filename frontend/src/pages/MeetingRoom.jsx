import "./MeetingRoom.css";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import VideoGrid from "../components/meeting/VideoGrid";
import RightSidebar from "../components/meeting/RightSidebar";
import BottomControls from "../components/meeting/BottomControls";
import ShowUIButton from "../components/meeting/ShowUIButton";

import websocketService from "../services/websocketService";
import webrtcService from "../services/webrtcService";
import audioService from "../services/audioService";

const MeetingRoom = () => {

    const { meetingId } = useParams();

    const userId = localStorage.getItem("user_id");
    const userName = localStorage.getItem("user_name");

    const [participants, setParticipants] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [transcript, setTranscript] = useState([]);
    const [translations, setTranslations] = useState([]);
    const [language, setLanguage] = useState("English");
    // const { meetingId } = useParams();
    // const currentMeetingId = meetingId || "test-meeting";

    useEffect(() => {

        if (!userId) {
            console.error("User ID is missing.");
            return;
        }

        const initializeMeeting = async () => {

            try {

                const stream =
                    await webrtcService.startLocalStream();

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
                await websocketService.connect(
                    meetingId,
                    userId,
                    async (data) => {
                        switch (data.type) {
                            case "user_joined":
                                if (data.user_id !== userId) {
                                    await webrtcService.createPeerConnection(
                                        data.user_id
                                    );
                                    await webrtcService.createOffer(
                                        data.user_id
                                    );
                                }
                                break;
                            case "offer":
                                await webrtcService.createPeerConnection(
                                    data.from
                                );
                                await webrtcService.createAnswer(
                                    data.from,
                                    data.offer
                                );
                                break;
                            case "answer":
                                await webrtcService.setRemoteAnswer(
                                    data.answer
                                );
                                break;
                            case "ice_candidate":
                                await webrtcService.addIceCandidate(
                                    data.candidate
                                );
                                break;
                            case "chat":
                                setChatMessages(prev => [...prev, data]);
                                break;
                            case "transcript":
                                setTranscript(prev => [...prev, data]);
                                break;
                            case "translation":
                                setTranslations(prev => [...prev, data]);
                                break;
                            case "user_left":
                                setParticipants(prev =>
                                    prev.filter(
                                        p => p.id !== data.user_id ));
                                break;
                            default:
                                console.log(data);
                            }
                        }
                    );
                await new Promise(resolve => setTimeout(resolve, 500));
                await audioService.startRecording(
                    (audioChunk) => {

                       if (websocketService.socket &&websocketService.socket.readyState === WebSocket.OPEN)
                        {
                            websocketService.send({
                                type: "audio_stream",
                                meeting_id: meetingId,
                                user_id: userId,
                                language,
                                audio: Array.from(new Uint8Array(audioChunk)),
                            });
                        }

                    }
                );

            } catch (error) {

                console.error(
                    "Meeting initialization failed:",
                    error
                );

            }

        };

        initializeMeeting();

        return () => {

            audioService.stopRecording();

            websocketService.disconnect();

            webrtcService.closeConnection();

        };

    }, [meetingId, userId]);

    useEffect(() => {

        setParticipants((prev) =>
            prev.map((participant) =>
                participant.local
                    ? {
                          ...participant,
                          language,
                      }
                    : participant
            )
        );

    }, [language]);

    return (
              <div className="meeting-room">

            {/* Header */}

            <header className="meeting-header">

                <div className="meeting-logo">

                    <div className="logo-circle">
                        🌐
                    </div>

                    <h2>LINGUASYNC</h2>

                </div>

                <div className="focus-mode">

                    <span className="status-dot"></span>

                    <span>Focus Mode</span>

                </div>

                <ShowUIButton />

            </header>

            {/* Main Content */}

            <main className="meeting-main">

                {/* Left Side - Video Grid */}

                <section className="meeting-left">

                    <VideoGrid
                        participants={participants}
                    />

                </section>

                {/* Right Sidebar */}

                <aside className="meeting-right">

                    <RightSidebar
                        participants={participants}
                        transcript={transcript}
                        translations={translations}
                        chatMessages={chatMessages}
                        language={language}
                        setLanguage={setLanguage}
                    />

                </aside>

            </main>

            {/* Bottom Controls */}

            <BottomControls />

        </div>

    );

};

export default MeetingRoom;