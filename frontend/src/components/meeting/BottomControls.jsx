import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./BottomControls.css";

import {
    FaMicrophone,
    FaMicrophoneSlash,
    FaVideo,
    FaVideoSlash,
    FaComments,
    FaUsers,
    FaUserPlus,
    FaLanguage,
    FaDownload,
    FaPhoneSlash,
    FaClosedCaptioning,
    FaVolumeUp,
    FaVolumeMute,
} from "react-icons/fa";

import webrtcService from "../../services/webrtcService";
import websocketService from "../../services/websocketService";

import {
    leaveMeeting as leaveMeetingAPI
} from "../../services/meetingService";

const BottomControls = () => {

    const navigate = useNavigate();

    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);
    const [speakerOn, setSpeakerOn] = useState(true);

    const meetingId = window.location.pathname.split("/").pop();
    const userId = localStorage.getItem("user_id");

    // ==========================
    // Toggle Microphone
    // ==========================

    const toggleMic = () => {

        const stream = webrtcService.localStream;

        if (!stream) return;

        stream.getAudioTracks().forEach(track => {

            track.enabled = !track.enabled;

        });

        setMicOn(prev => !prev);

    };

    // ==========================
    // Toggle Camera
    // ==========================

    const toggleCamera = () => {

        const stream = webrtcService.localStream;

        if (!stream) return;

        stream.getVideoTracks().forEach(track => {

            track.enabled = !track.enabled;

        });

        setCameraOn(prev => !prev);

    };

    // ==========================
    // Toggle Speaker
    // ==========================

    const toggleSpeaker = () => {

        setSpeakerOn(prev => !prev);

    };

    // ==========================
    // Add Participants
    // ==========================

    const handleAddParticipants = () => {

        navigate(`/meeting/${meetingId}/participants`);

    };

    // ==========================
    // Leave Meeting
    // Backend decides whether to
    // end meeting or remove user.
    // ==========================

    const leaveMeeting = async () => {

        try {

            if (meetingId && userId) {

                await leaveMeetingAPI(
                    meetingId,
                    userId
                );

            }

        }

        catch (error) {

            console.error(
                "Leave Meeting Error:",
                error
            );

        }

        websocketService.disconnect();

        webrtcService.closeConnection();

        navigate("/dashboard");

    };

    return (

        <div className="bottom-controls">

            {/* Left Controls */}

            <div className="control-group">

                <button
                    className={`control-btn ${micOn ? "active" : ""}`}
                    onClick={toggleMic}
                    title="Microphone"
                >

                    {
                        micOn
                            ? <FaMicrophone />
                            : <FaMicrophoneSlash />
                    }

                </button>

                <button
                    className={`control-btn ${cameraOn ? "active" : ""}`}
                    onClick={toggleCamera}
                    title="Camera"
                >

                    {
                        cameraOn
                            ? <FaVideo />
                            : <FaVideoSlash />
                    }

                </button>

                <button
                    className={`control-btn ${speakerOn ? "active" : ""}`}
                    onClick={toggleSpeaker}
                    title="Speaker"
                >

                    {
                        speakerOn
                            ? <FaVolumeUp />
                            : <FaVolumeMute />
                    }

                </button>

            </div>

            {/* Center Controls */}

            <div className="control-group">

                <button
                    className="control-btn"
                    onClick={handleAddParticipants}
                    title="Add Participants"
                >

                    <FaUserPlus />

                </button>

                <button
                    className="control-btn"
                    title="Participants"
                >

                    <FaUsers />

                </button>

                <button
                    className="control-btn"
                    title="Chat"
                >

                    <FaComments />

                </button>

                <button
                    className="control-btn"
                    title="Live Captions"
                >

                    <FaClosedCaptioning />

                </button>

                <button
                    className="control-btn"
                    title="Translation"
                >

                    <FaLanguage />

                </button>

                <button
                    className="control-btn"
                    title="Download Transcript"
                >

                    <FaDownload />

                </button>

            </div>

            {/* Right Controls */}

            <div className="control-group">

                <button
                    className="leave-btn"
                    onClick={leaveMeeting}
                    title="Leave Meeting"
                >

                    <FaPhoneSlash />

                    <span>

                        Leave

                    </span>

                </button>

            </div>

        </div>

    );

};

export default BottomControls;