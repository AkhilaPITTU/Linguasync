import { useEffect, useState } from "react";
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
    exportConversationPdf,
    leaveMeeting as leaveMeetingAPI,
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

    const [leaveDialog, setLeaveDialog] =
        useState(false);

    const [exportState, setExportState] =
        useState("idle");

    const [exportError, setExportError] =
        useState("");

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

    useEffect(() => {

        const handleEscape = (event) => {

            if (event.key === "Escape" && !exportState.startsWith("exporting")) {

                setLeaveDialog(false);
                setExportState("idle");
                setExportError("");

            }

        };

        window.addEventListener("keydown", handleEscape);

        return () => window.removeEventListener("keydown", handleEscape);

    }, [exportState]);

    const completeLeave = async () => {

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

    const openLeaveDialog = () => {

        setExportState("idle");
        setExportError("");
        setLeaveDialog(true);

    };

    const leaveWithoutSaving = async () => {

        setLeaveDialog(false);
        await completeLeave();

    };

    const saveAndExport = async () => {

        setExportState("exporting");
        setExportError("");

        try {

            await exportConversationPdf(meetingId);
            setLeaveDialog(false);
            await completeLeave();

        } catch (error) {

            let message = "Unable to export the conversation. Please try again or leave without saving.";

            if (error.response?.data instanceof Blob) {

                try {

                    const payload = JSON.parse(await error.response.data.text());
                    message = payload.detail || message;

                } catch {

                    // Keep the safe fallback message for a non-JSON error response.

                }

            }

            console.error("[EXPORT ERROR]", {
                status: error.response?.status,
                message,
            });

            setExportError(message);
            setExportState("error");

        }

    };

    return (

        <>
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
                    onClick={openLeaveDialog}
                    title="Leave Meeting"
                >

                    <FaPhoneSlash />

                    <span>
                        Leave
                    </span>

                </button>

            </div>

        </div>

        {leaveDialog && (

            <div
                className="leave-dialog-backdrop"
                role="presentation"
                onMouseDown={() => {

                    if (!exportState.startsWith("exporting")) {

                        setLeaveDialog(false);
                        setExportState("idle");
                        setExportError("");

                    }

                }}
            >

                <section
                    className="leave-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="leave-dialog-title"
                    onMouseDown={(event) => event.stopPropagation()}
                >

                    <h2 id="leave-dialog-title">
                        {exportState === "error"
                            ? "Unable to export conversation"
                            : "Save conversation before leaving?"}
                    </h2>

                    <p>
                        {exportState === "error"
                            ? exportError
                            : "Download a PDF of this meeting in your preferred language before you leave."}
                    </p>

                    <div className="leave-dialog-actions">

                        {exportState === "error" ? (

                            <>
                                <button
                                    className="leave-dialog-export"
                                    onClick={saveAndExport}
                                >
                                    Try Again
                                </button>

                                <button
                                    className="leave-dialog-danger"
                                    onClick={leaveWithoutSaving}
                                >
                                    Leave Without Saving
                                </button>

                                <button
                                    className="leave-dialog-cancel"
                                    onClick={() => setLeaveDialog(false)}
                                >
                                    Cancel
                                </button>
                            </>

                        ) : (

                            <>
                                <button
                                    className="leave-dialog-export"
                                    onClick={saveAndExport}
                                    disabled={exportState === "exporting"}
                                >
                                    {exportState === "exporting" ? "Exporting..." : "Save & Export"}
                                </button>

                                <button
                                    className="leave-dialog-danger"
                                    onClick={leaveWithoutSaving}
                                    disabled={exportState === "exporting"}
                                >
                                    Leave Without Saving
                                </button>

                                <button
                                    className="leave-dialog-cancel"
                                    onClick={() => setLeaveDialog(false)}
                                    disabled={exportState === "exporting"}
                                >
                                    Cancel
                                </button>
                            </>

                        )}

                    </div>

                </section>

            </div>
        )}
        </>

    );
};

export default BottomControls;
