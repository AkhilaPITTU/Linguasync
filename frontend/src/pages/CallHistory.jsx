import "./CallHistory.css";
import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../services/apiConfig";

const API = axios.create({
    baseURL: API_BASE_URL
});

const CallHistory = () => {

    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const token = localStorage.getItem("access_token");

    useEffect(() => {

        const fetchCallHistory = async () => {

            try {

                setLoading(true);
                setError("");

                const response = await API.get(
                    "/api/call-history",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const data = response.data;

                if (Array.isArray(data)) {
                    setCalls(data);
                }
                else if (Array.isArray(data?.calls)) {
                    setCalls(data.calls);
                }
                else {
                    setCalls([]);
                }

            }
            catch (err) {

                console.error(
                    "Failed to load call history:",
                    err
                );

                setError(
                    err.response?.data?.detail ||
                    "Unable to load call history."
                );

            }
            finally {

                setLoading(false);

            }

        };

        if (token) {
            fetchCallHistory();
        }
        else {

            setLoading(false);

            setError(
                "Please login to view call history."
            );

        }

    }, [token]);

    const formatDate = (dateValue) => {

        if (!dateValue) {
            return "Unknown";
        }

        try {

            return new Date(dateValue).toLocaleString(
                "en-IN",
                {
                    dateStyle: "medium",
                    timeStyle: "short"
                }
            );

        }
        catch {

            return "Unknown";

        }

    };

    const getCallType = (call) => {

        return (
            call.call_type ||
            call.meeting_type ||
            "video"
        );

    };

    const getStatus = (call) => {

        return (
            call.status ||
            "completed"
        );

    };

    const getParticipantsCount = (call) => {

        if (Array.isArray(call.participants)) {
            return call.participants.length;
        }

        if (typeof call.participant_count === "number") {
            return call.participant_count;
        }

        return 0;

    };

    return (

        <div className="call-history-page">

            <div className="call-history-header">

                <div>

                    <h1>
                        Call History
                    </h1>

                    <p>
                        View your previous LINGUASYNC meetings
                    </p>

                </div>

                <div className="call-history-count">

                    <span>
                        {calls.length}
                    </span>

                    <small>
                        Calls
                    </small>

                </div>

            </div>

            {loading && (

                <div className="call-history-state">

                    <div className="loading-spinner"></div>

                    <p>
                        Loading call history...
                    </p>

                </div>

            )}

            {!loading && error && (

                <div className="call-history-state error">

                    <div className="state-icon">
                        ⚠️
                    </div>

                    <h3>
                        Unable to load history
                    </h3>

                    <p>
                        {error}
                    </p>

                </div>

            )}

            {!loading &&
                !error &&
                calls.length === 0 && (

                    <div className="call-history-state">

                        <div className="state-icon">
                            📞
                        </div>

                        <h3>
                            No calls yet
                        </h3>

                        <p>
                            Your completed meetings will
                            appear here.
                        </p>

                    </div>

                )}

            {!loading &&
                !error &&
                calls.length > 0 && (

                    <div className="call-history-list">

                        {calls.map((call, index) => {

                            const callType =
                                getCallType(call);

                            const status =
                                getStatus(call);

                            const participantCount =
                                getParticipantsCount(call);

                            return (

                                <div
                                    className="call-history-card"
                                    key={
                                        call.id ||
                                        call.meeting_id ||
                                        index
                                    }
                                >

                                    <div className="call-icon">

                                        {callType === "audio"
                                            ? "📞"
                                            : "🎥"}

                                    </div>

                                    <div className="call-details">

                                        <h3>

                                            {call.title ||
                                                call.meeting_name ||
                                                "LINGUASYNC Meeting"}

                                        </h3>

                                        <p>

                                            {formatDate(
                                                call.started_at ||
                                                call.created_at ||
                                                call.date
                                            )}

                                        </p>

                                        <div className="call-meta">

                                            <span>
                                                {callType === "audio"
                                                    ? "Audio Call"
                                                    : "Video Call"}
                                            </span>

                                            <span>
                                                👥{" "}
                                                {participantCount}{" "}
                                                Participants
                                            </span>

                                        </div>

                                    </div>

                                    <div
                                        className={`call-status ${status.toLowerCase()}`}
                                    >

                                        {status}

                                    </div>

                                </div>

                            );

                        })}

                    </div>

                )}

        </div>

    );

};

export default CallHistory;
