import "./ActiveCommunication.css";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getActiveMeeting } from "../../services/meetingService";

import {
    getPendingInvitations,
    acceptInvitation,
    rejectInvitation
} from "../../services/invitationService";

import {
    FiPhone,
    FiVideo,
    FiMic,
    FiUsers,
    FiClock,
    FiGlobe,
    FiVolume2,
    FiPhoneCall,
    FiX
} from "react-icons/fi";


function ActiveCommunication() {

    const [activeCall, setActiveCall] = useState(null);
    const [incomingCall, setIncomingCall] = useState(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);

    const navigate = useNavigate();


    // =====================================================
    // FETCH ACTIVE MEETING + PENDING INVITATIONS
    // =====================================================

    useEffect(() => {

        let mounted = true;

        const fetchData = async () => {

            try {

                const meetingRes = await getActiveMeeting();

                if (!mounted) return;


                // -------------------------------------------------
                // USER ALREADY HAS AN ACTIVE MEETING
                // -------------------------------------------------

                if (
                    meetingRes?.success &&
                    meetingRes?.meeting
                ) {

                    setActiveCall(
                        meetingRes.meeting
                    );

                    setIncomingCall(null);

                }

                // -------------------------------------------------
                // NO ACTIVE MEETING
                // CHECK PENDING INVITATIONS
                // -------------------------------------------------

                else {

                    setActiveCall(null);

                    const inviteRes =
                        await getPendingInvitations();

                    if (!mounted) return;


                    if (
                        inviteRes?.success &&
                        Array.isArray(inviteRes.data) &&
                        inviteRes.data.length > 0
                    ) {

                        setIncomingCall(
                            inviteRes.data[0]
                        );

                    }
                    else {

                        setIncomingCall(null);

                    }

                }

            }
            catch (error) {

                console.error(
                    "Failed to fetch communication data:",
                    error
                );

                if (!mounted) return;

                setActiveCall(null);
                setIncomingCall(null);

            }
            finally {

                if (mounted) {
                    setLoading(false);
                }

            }

        };


        fetchData();


        // Refresh every 3 seconds
        const interval = setInterval(
            fetchData,
            3000
        );


        return () => {

            mounted = false;

            clearInterval(interval);

        };

    }, []);


    // =====================================================
    // OPEN ACTIVE MEETING
    // =====================================================

    const openMeeting = () => {

        if (!activeCall?.meeting_id) {

            console.error(
                "Active meeting ID is missing:",
                activeCall
            );

            return;

        }

        console.log(
            "Opening active meeting:",
            activeCall.meeting_id
        );

        navigate(
            `/meeting/${activeCall.meeting_id}`
        );

    };


    // =====================================================
    // ACCEPT INVITATION + JOIN MEETING
    // =====================================================

    const joinInvitation = async () => {

        if (!incomingCall) {

            console.error(
                "No incoming invitation found."
            );

            return;

        }


        // IMPORTANT:
        // meeting_id is already present in the
        // pending invitation returned by backend.

        const meetingId =
            incomingCall.meeting_id;


        console.log(
            "\n========== ACCEPT INVITATION =========="
        );

        console.log(
            "Invitation ID:",
            incomingCall.invitation_id
        );

        console.log(
            "Meeting ID:",
            meetingId
        );

        console.log(
            "Host ID:",
            incomingCall.host_id
        );

        console.log(
            "Host Name:",
            incomingCall.host_name
        );


        // -------------------------------------------------
        // SAFETY CHECK
        // -------------------------------------------------

        if (!meetingId) {

            console.error(
                "❌ Meeting ID is missing from invitation:",
                incomingCall
            );

            return;

        }


        try {

            setJoining(true);


            // -------------------------------------------------
            // ACCEPT INVITATION
            // -------------------------------------------------

            const response =
                await acceptInvitation(
                    incomingCall.invitation_id
                );


            console.log(
                "Invitation Accepted Response:",
                response
            );


            if (!response?.success) {

                console.error(
                    "Invitation acceptance failed:",
                    response
                );

                return;

            }


            // -------------------------------------------------
            // IMPORTANT
            //
            // DO NOT depend on response.meeting_id.
            //
            // We already have the correct meeting ID from:
            //
            // incomingCall.meeting_id
            // -------------------------------------------------

            console.log(
                "Navigating to meeting:",
                meetingId
            );


            navigate(
                `/meeting/${meetingId}`
            );


        }
        catch (error) {

            console.error(
                "❌ Failed to accept invitation:",
                error
            );

        }
        finally {

            setJoining(false);

        }

    };


    // =====================================================
    // REJECT INVITATION
    // =====================================================

    const declineInvitation = async () => {

        if (!incomingCall) {
            return;
        }


        try {

            await rejectInvitation(
                incomingCall.invitation_id
            );


            setIncomingCall(null);


            console.log(
                "Invitation rejected."
            );

        }
        catch (error) {

            console.error(
                "Failed to reject invitation:",
                error
            );

        }

    };


    // =====================================================
    // OUTPUT MODE
    // =====================================================

    const outputMode = {

        original:
            "Original Voice",

        text:
            "Translated Text",

        speech:
            "Translated Speech",

        translated_speech:
            "Translated Speech",

        text_speech:
            "Text + Speech"

    };


    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {

        return (

            <div className="active-communication">

                <div className="communication-loading">

                    Loading communication...

                </div>

            </div>

        );

    }


    // =====================================================
    // RENDER
    // =====================================================

    return (

        <div className="active-communication">


            {/* =================================================
                ACTIVE MEETING
            ================================================= */}

            {activeCall && (

                <div className="communication-card active-call-card">

                    <div className="communication-card-header">

                        <div className="communication-icon video-icon">

                            {activeCall.meeting_type === "video"
                                ? <FiVideo />
                                : <FiPhone />
                            }

                        </div>


                        <div>

                            <h3>
                                Active Communication
                            </h3>

                            <p>
                                You are currently in a meeting
                            </p>

                        </div>

                    </div>


                    <div className="communication-details">


                        <div className="communication-detail">

                            <FiUsers />

                            <span>

                                {activeCall.participants || 1}

                                {" "}

                                {activeCall.participants === 1
                                    ? "Participant"
                                    : "Participants"
                                }

                            </span>

                        </div>


                        <div className="communication-detail">

                            <FiClock />

                            <span>

                                {activeCall.duration || "00:00:00"}

                            </span>

                        </div>


                        <div className="communication-detail">

                            <FiGlobe />

                            <span>

                                {activeCall.preferred_language ||
                                    "English"}

                            </span>

                        </div>


                        <div className="communication-detail">

                            <FiVolume2 />

                            <span>

                                {
                                    outputMode[
                                        activeCall.output_mode
                                    ] ||
                                    "Original Voice"
                                }

                            </span>

                        </div>


                    </div>


                    <div className="communication-status">

                        <span className="status-dot"></span>

                        <span>

                            {activeCall.translation_status ||
                                "Running"}

                        </span>

                    </div>


                    <button
                        className="communication-primary-btn"
                        onClick={openMeeting}
                    >

                        {activeCall.meeting_type === "video"
                            ? <FiVideo />
                            : <FiPhoneCall />
                        }

                        Continue Meeting

                    </button>

                </div>

            )}


            {/* =================================================
                INCOMING INVITATION
            ================================================= */}

            {!activeCall && incomingCall && (

                <div className="communication-card incoming-call-card">


                    <div className="communication-card-header">


                        <div className="communication-icon incoming-icon">

                            {incomingCall.meeting_type === "video"
                                ? <FiVideo />
                                : <FiPhoneCall />
                            }

                        </div>


                        <div>

                            <h3>
                                Incoming Meeting
                            </h3>

                            <p>
                                You have been invited to a meeting
                            </p>

                        </div>


                    </div>


                    <div className="incoming-user">


                        <div className="incoming-avatar">

                            {
                                incomingCall.host_name
                                    ?.charAt(0)
                                    ?.toUpperCase() || "U"
                            }

                        </div>


                        <div className="incoming-user-info">

                            <strong>

                                {
                                    incomingCall.host_name ||
                                    "Meeting Host"
                                }

                            </strong>

                            <span>

                                {
                                    incomingCall.host_email ||
                                    "Invitation received"
                                }

                            </span>

                        </div>


                    </div>


                    <div className="communication-details">


                        <div className="communication-detail">

                            <FiVideo />

                            <span>

                                {
                                    incomingCall.meeting_type ===
                                    "video"
                                        ? "Video Meeting"
                                        : "Audio Meeting"
                                }

                            </span>

                        </div>


                        <div className="communication-detail">

                            <FiGlobe />

                            <span>

                                {
                                    incomingCall.preferred_language ||
                                    "English"
                                }

                            </span>

                        </div>


                        <div className="communication-detail">

                            <FiVolume2 />

                            <span>

                                {
                                    outputMode[
                                        incomingCall.output_mode
                                    ] ||
                                    "Original Voice"
                                }

                            </span>

                        </div>


                    </div>


                    {/* Debug information - useful while fixing join */}

                    <div
                        className="invitation-meeting-id"
                        style={{
                            fontSize: "12px",
                            opacity: 0.65,
                            marginBottom: "12px"
                        }}
                    >

                        Meeting ID: {incomingCall.meeting_id}

                    </div>


                    <div className="incoming-call-actions">


                        <button
                            className="accept-call-btn"
                            onClick={joinInvitation}
                            disabled={joining}
                        >

                            <FiPhoneCall />

                            {joining
                                ? "Joining..."
                                : "Accept & Join"
                            }

                        </button>


                        <button
                            className="reject-call-btn"
                            onClick={declineInvitation}
                            disabled={joining}
                        >

                            <FiX />

                            Decline

                        </button>


                    </div>


                </div>

            )}


            {/* =================================================
                NO ACTIVE CALL / NO INVITATION
            ================================================= */}

            {!activeCall && !incomingCall && (

                <div className="communication-card no-call-card">


                    <div className="communication-icon">

                        <FiPhone />

                    </div>


                    <h3>
                        No Active Communication
                    </h3>


                    <p>
                        You don't have an active meeting
                        or pending invitation.
                    </p>


                </div>

            )}

        </div>

    );

}


export default ActiveCommunication;