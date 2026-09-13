import { useEffect, useRef, useState } from "react";
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
    FaPhoneSlash,
    FaClosedCaptioning,
    FaVolumeUp,
    FaVolumeMute,
    FaDesktop,
    FaStop,
    FaSpinner,
} from "react-icons/fa";

import webrtcService from "../../services/webrtcService";
import websocketService from "../../services/websocketService";

import {
    leaveMeeting as leaveMeetingAPI,
    endMeeting as endMeetingAPI,
} from "../../services/meetingService";
import {
    downloadConversationPdf,
    getExportErrorMessage,
} from "../../services/conversationExportService";
import { showToast } from "../notification/toastService";

const BottomControls = ({
    onAddParticipants,
    meetingType = "video",
    onOpenPanel = () => {},
    onSpeakerChange = () => {},
    onMicrophoneChange = () => {},
    onBeforeLeave = async () => ({ flushed: false }),
    microphoneMuted = false,
    speakerMuted = false,
    isMeetingHost = false,
}) => {

    const navigate = useNavigate();

    const isAudioCall =
        meetingType?.toLowerCase() === "audio";

    const isVideoCall =
        !isAudioCall;

    const micOn = !microphoneMuted;

    const [cameraOn, setCameraOn] =
        useState(isVideoCall);

    const speakerOn = !speakerMuted;

    const [screenSharing, setScreenSharing] = useState(false);

    const [leaveDialog, setLeaveDialog] =
        useState(false);

    const [isLeaving, setIsLeaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const flushPromiseRef = useRef(null);

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

        onMicrophoneChange(!micOn);
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

        onSpeakerChange(!speakerOn);

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

            if (event.key === "Escape" && !isExporting) setLeaveDialog(false);

        };

        window.addEventListener("keydown", handleEscape);

        return () => window.removeEventListener("keydown", handleEscape);

    }, [isExporting]);

    const prepareForLeave = async () => {
        if (!flushPromiseRef.current) {
            flushPromiseRef.current = Promise.resolve(onBeforeLeave());
        }
        return flushPromiseRef.current;
    };

    const completeLeave = async () => {

        if (isLeaving) return;
        setIsLeaving(true);

        try {

            const flushResult = await prepareForLeave();
            console.log("[conversation-save] frontend flush", flushResult);

            if (meetingId && userId) {

                if (isMeetingHost) {
                    await endMeetingAPI(meetingId, userId);
                } else {
                    await leaveMeetingAPI(meetingId, userId);
                }

            }

            // `meeting_id` is only a convenience used after creating a
            // meeting. Do not let it point at a completed/left meeting.
            if (localStorage.getItem("meeting_id") === meetingId) {
                localStorage.removeItem("meeting_id");
            }
            if (sessionStorage.getItem("meeting_id") === meetingId) {
                sessionStorage.removeItem("meeting_id");
            }

            // Keep any mounted dashboard view in this tab in sync with the
            // completed leave/end request. The dashboard still verifies this
            // state with the backend when it loads.
            window.dispatchEvent(new CustomEvent("meeting-state-cleared"));

            websocketService.disconnect();
            webrtcService.closeConnection();
            navigate("/dashboard");

        } catch (error) {

            console.error(
                "Leave Meeting Error:",
                error
            );
            showToast("Unable to finalize the meeting. Please try again.");
            setIsLeaving(false);
        }

    };

    // ==========================================
    // SAVE & EXPORT (End Call confirmation modal)
    // ==========================================

    const handleSaveAndExport = async () => {

        if (isExporting || isLeaving) return;

        setIsExporting(true);

        try {

            await downloadConversationPdf(meetingId);
            showToast("Your conversation PDF has been downloaded.", "success");

            setLeaveDialog(false);
            await completeLeave();

        } catch (exportError) {

            console.error("Conversation PDF export error:", exportError);
            const message = await getExportErrorMessage(exportError);
            showToast(message, "error");
            // Keep the user in the meeting (and the modal open) so they can
            // retry, or choose "Leave Without Saving" instead.

        } finally {

            setIsExporting(false);

        }

    };

    const handleLeaveWithoutSaving = () => {

        if (isExporting) return;

        setLeaveDialog(false);
        completeLeave();

    };

    const handleCancelLeaveDialog = () => {

        if (isExporting) return;

        setLeaveDialog(false);

    };

    const toggleScreenShare = async () => {
        try {
            if (screenSharing) {
                await webrtcService.stopScreenShare();
                setScreenSharing(false);
            } else {
                const screenStream = await webrtcService.startScreenShare();
                screenStream.getVideoTracks()[0]?.addEventListener("ended", () => {
                    setScreenSharing(false);
                }, { once: true });
                setScreenSharing(true);
            }
        } catch (error) {
            console.error("Screen sharing error:", error);
            setScreenSharing(false);
        }
    };

    const openLeaveDialog = () => {

        setLeaveDialog(true);

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
                    type="button"
                    className={`control-btn ${
                        micOn ? "active" : ""
                    }`}
                    onClick={toggleMic}
                    aria-pressed={!micOn}
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
                        type="button"
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
                    type="button"
                    className={`control-btn ${
                        speakerOn ? "active" : ""
                    }`}
                    onClick={toggleSpeaker}
                    aria-pressed={!speakerOn}
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
                    onClick={() => onOpenPanel("participants")}
                    title="Participants"
                >

                    <FaUsers />

                </button>

                {/* CHAT */}

                <button
                    className="control-btn"
                    onClick={() => onOpenPanel("chat")}
                    title="Chat"
                >

                    <FaComments />

                </button>

                {/* LIVE CAPTIONS */}

                <button
                    className="control-btn"
                    onClick={() => onOpenPanel("transcript")}
                    title="Live Captions"
                >

                    <FaClosedCaptioning />

                </button>

                {/* TRANSLATION */}

                <button
                    className="control-btn"
                    onClick={() => onOpenPanel("translation")}
                    title="Translation"
                >

                    <FaLanguage />

                </button>

                <button
                    className={`control-btn ${screenSharing ? "active" : ""}`}
                    onClick={toggleScreenShare}
                    title={screenSharing ? "Stop Screen Sharing" : "Share Screen"}
                >
                    {screenSharing ? <FaStop /> : <FaDesktop />}
                </button>

            </div>

            {/* =================================
                RIGHT CONTROLS
            ================================= */}

            <div className="control-group">

                <button
                    className="leave-btn"
                    onClick={openLeaveDialog}
                    title={isMeetingHost ? "End Meeting" : "Leave Meeting"}
                >

                    <FaPhoneSlash />

                    <span>
                        {isMeetingHost ? "End" : "Leave"}
                    </span>

                </button>

            </div>

        </div>

        {leaveDialog && (

            <div
                className="leave-dialog-backdrop"
                role="presentation"
                onMouseDown={handleCancelLeaveDialog}
            >

                <section
                    className="leave-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="leave-dialog-title"
                    onMouseDown={(event) => event.stopPropagation()}
                >

                    <h2 id="leave-dialog-title">
                        Save conversation before leaving?
                    </h2>

                    <p>
                        Download a PDF of this meeting in your preferred language before you leave.
                    </p>

                    <div className="leave-dialog-actions">

                        <button
                            className="leave-dialog-primary"
                            onClick={handleSaveAndExport}
                            disabled={isExporting || isLeaving}
                        >
                            {isExporting
                                ? <><FaSpinner className="spin" /> Preparing PDF…</>
                                : "Save & Export"}
                        </button>

                        <button
                            className="leave-dialog-danger"
                            onClick={handleLeaveWithoutSaving}
                            disabled={isExporting || isLeaving}
                        >
                            {isLeaving ? "Leaving..." : "Leave Without Saving"}
                        </button>

                        <button
                            className="leave-dialog-cancel"
                            onClick={handleCancelLeaveDialog}
                            disabled={isExporting || isLeaving}
                        >
                            Cancel
                        </button>

                    </div>

                </section>

            </div>
        )}
        </>

    );
};

export default BottomControls;
