import "./ActiveCommunication.css";

import { useEffect, useState } from "react";

import { getActiveMeeting } from "../../services/meetingService";

import {
    FiPhone,
    FiVideo,
    FiMic,
    FiUsers,
    FiClock,
    FiGlobe,
} from "react-icons/fi";

function ActiveCommunication() {

    const [activeCall, setActiveCall] = useState(null);

    const [loading, setLoading] = useState(true);

    useEffect(() => {

        async function fetchActiveMeeting() {

            try {

                const response = await getActiveMeeting();

                if (response.success) {

                    setActiveCall(response.meeting);

                } else {

                    setActiveCall(null);

                }

            }

            catch (error) {

                console.error("Active Meeting Error:", error);

                setActiveCall(null);

            }

            finally {

                setLoading(false);

            }

        }

        fetchActiveMeeting();

    }, []);

    // ==========================
    // Loading
    // ==========================

    if (loading) {

        return (

            <div className="active-card">

                <h3>Loading Active Meeting...</h3>

            </div>

        );

    }

    // ==========================
    // No Active Meeting
    // ==========================

    if (!activeCall) {

        return (

            <div className="active-card">

                <div className="active-header">

                    <span className="live-status">

                        ● OFFLINE

                    </span>

                </div>

                <div className="participant">

                    <img

                        src="/images/user.png"

                        alt="User"

                    />

                    <div>

                        <h3>No Active Meeting</h3>

                        <p>Create or Join a Meeting</p>

                    </div>

                </div>

            </div>

        );

    }

    return (

        <div className="active-card">

            {/* Header */}

            <div className="active-header">

                <span className="live-status">

                    ● ACTIVE

                </span>

                <div className="call-time">

                    <FiClock />

                    {activeCall.duration}

                </div>

            </div>

            {/* Host */}

            <div className="participant">

                <img

                    src="/images/user.png"

                    alt="User"

                />

                <div>

                    <h3>

                        {activeCall.host_name}

                    </h3>

                    <p>

                        Meeting Host

                    </p>

                </div>

            </div>

            {/* Information */}

            <div className="communication-info">

                <div>

                    <span>

                        Mode

                    </span>

                    <strong>

                        {activeCall.meeting_type === "video"

                            ? "📹 Video"

                            : "🎙 Audio"}

                    </strong>

                </div>

                <div>

                    <span>

                        Participants

                    </span>

                    <strong>

                        <FiUsers />

                        {activeCall.participants}

                    </strong>

                </div>

                <div>

                    <span>

                        Languages

                    </span>

                    <strong>

                        {activeCall.source_language}

                        →

                        {activeCall.target_language}

                    </strong>

                </div>

                <div>

                    <span>

                        Translation

                    </span>

                    <strong className="running">

                        <FiGlobe />

                        {activeCall.translation_status}

                    </strong>

                </div>

                <div>

                    <span>

                        Microphone

                    </span>

                    <strong>

                        <FiMic />

                        {activeCall.microphone_status}

                    </strong>

                </div>

                <div>

                    <span>

                        Camera

                    </span>

                    <strong>

                        <FiVideo />

                        {activeCall.camera_status}

                    </strong>

                </div>

                <div>

                    <span>

                        Status

                    </span>

                    <strong>

                        {activeCall.status}

                    </strong>

                </div>

            </div>

            {/* Controls */}

            <div className="control-buttons">

                <button>

                    <FiMic />

                </button>

                <button>

                    <FiVideo />

                </button>

            </div>

            {/* Button */}

            <button className="join-button">

                <FiPhone />

                Open Call

            </button>

        </div>

    );

}

export default ActiveCommunication;