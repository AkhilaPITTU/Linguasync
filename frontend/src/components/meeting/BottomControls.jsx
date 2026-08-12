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

const BottomControls = ({
    onAddParticipants,
    meetingType = "video"
}) => {

    const navigate = useNavigate();

    const isAudioCall =
        meetingType?.toLowerCase() === "audio";

    const isVideoCall =
        !isAudioCall;

    const [micOn, setMicOn] = useState(true);

    const [cameraOn, setCameraOn] =
        useState(isVideoCall);

    const [speakerOn, setSpeakerOn] =
        useState(true);

    const meetingId =
        window.location.pathname
            .split("/")
            .pop();

    const rawUserId =
        localStorage.getItem("user_id");

    const userId =
        rawUserId?.includes(":")
            ? rawUserId.split(":")[0]
            : rawUserId;

    // ==========================================
    // TOGGLE MICROPHONE
    // ==========================================

    const toggleMic = () => {

        const stream =
            webrtcService.localStream;

        if (!stream) return;

        const audioTracks =
            stream.getAudioTracks();

        if (audioTracks.length === 0) {
            console.warn(
                "No audio track available."
            );
            return;
        }

        const newState =
            !audioTracks[0].enabled;

        audioTracks.forEach(
            (track) => {
                track.enabled = newState;
            }
        );

        setMicOn(newState);

        console.log(
            "Microphone:",
            newState ? "ON" : "OFF"
        );
    };

    // ==========================================
    // TOGGLE CAMERA
    // ==========================================

    const toggleCamera = () => {

        // Camera does not exist in audio calls
        if (isAudioCall) {
            console.log(
                "Camera is disabled for audio calls."
            );
            return;
        }

        const stream =
            webrtcService.localStream;

        if (!stream) return;

        const videoTracks =
            stream.getVideoTracks();

        if (videoTracks.length === 0) {
            console.warn(
                "No video track available."
            );
            return;
        }

        const newState =
            !videoTracks[0].enabled;

        videoTracks.forEach(
            (track) => {
                track.enabled = newState;
            }
        );

        setCameraOn(newState);

        console.log(
            "Camera:",
            newState ? "ON" : "OFF"
        );
    };

    // ==========================================
    // TOGGLE SPEAKER
    // ==========================================

    const toggleSpeaker = () => {

        setSpeakerOn(
            (prev) => !prev
        );

    };

    // ==========================================
    // ADD PARTICIPANTS
    // ==========================================

    const handleAddParticipants = () => {

        if (onAddParticipants) {
            onAddParticipants();
        }

    };

    // ==========================================
    // LEAVE MEETING
    // ==========================================

    const leaveMeeting = async () => {

        try {

            if (meetingId && userId) {

                await leaveMeetingAPI(
                    meetingId,
                    userId
                );

            }

        } catch (error) {

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

            {/* =================================
                LEFT CONTROLS
            ================================= */}

            <div className="control-group">

                {/* MICROPHONE */}

                <button
                    className={`control-btn ${
                        micOn ? "active" : ""
                    }`}
                    onClick={toggleMic}
                    title={
                        micOn
                            ? "Mute Microphone"
                            : "Unmute Microphone"
                    }
                >

                    {micOn
                        ? <FaMicrophone />
                        : <FaMicrophoneSlash />
                    }

                </button>

                {/* CAMERA - VIDEO CALL ONLY */}

                {isVideoCall && (

                    <button
                        className={`control-btn ${
                            cameraOn ? "active" : ""
                        }`}
                        onClick={toggleCamera}
                        title={
                            cameraOn
                                ? "Turn Camera Off"
                                : "Turn Camera On"
                        }
                    >

                        {cameraOn
                            ? <FaVideo />
                            : <FaVideoSlash />
                        }

                    </button>

                )}

                {/* SPEAKER */}

                <button
                    className={`control-btn ${
                        speakerOn ? "active" : ""
                    }`}
                    onClick={toggleSpeaker}
                    title={
                        speakerOn
                            ? "Mute Speaker"
                            : "Unmute Speaker"
                    }
                >

                    {speakerOn
                        ? <FaVolumeUp />
                        : <FaVolumeMute />
                    }

                </button>

            </div>

            {/* =================================
                CENTER CONTROLS
            ================================= */}

            <div className="control-group">

                {/* ADD PARTICIPANTS */}

                <button
                    className="control-btn"
                    onClick={
                        handleAddParticipants
                    }
                    title="Add Participants"
                >

                    <FaUserPlus />

                </button>

                {/* PARTICIPANTS */}

                <button
                    className="control-btn"
                    title="Participants"
                >

                    <FaUsers />

                </button>

                {/* CHAT */}

                <button
                    className="control-btn"
                    title="Chat"
                >

                    <FaComments />

                </button>

                {/* LIVE CAPTIONS */}

                <button
                    className="control-btn"
                    title="Live Captions"
                >

                    <FaClosedCaptioning />

                </button>

                {/* TRANSLATION */}

                <button
                    className="control-btn"
                    title="Translation"
                >

                    <FaLanguage />

                </button>

                {/* DOWNLOAD TRANSCRIPT */}

                <button
                    className="control-btn"
                    title="Download Transcript"
                >

                    <FaDownload />

                </button>

            </div>

            {/* =================================
                RIGHT CONTROLS
            ================================= */}

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