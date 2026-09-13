import "./RecentCalls.css";

import { useEffect, useMemo, useState } from "react";

import { getRecentCalls } from "../../services/recentCallsService";

import {
    FiPhoneIncoming,
    FiPhoneOutgoing,
    FiVideo,
    FiMic,
    FiClock
} from "react-icons/fi";

// Every field rendered below (caller, receiver, direction, mode, status,
// duration, date, time) now comes directly from the Call History backend
// response (see backend/app/services/call_history_service.py) -- derived
// there from real stored ids (meeting.host_id, participants[].user_id,
// invitations.invited_user_id/status), never guessed or inferred here.
// There is no client-side name comparison and no "You" placeholder.

const STATUS_CLASS = {
    Completed: "is-completed",
    Ongoing: "is-ongoing",
    Missed: "is-missed",
    Rejected: "is-rejected",
    Cancelled: "is-cancelled",
};

function statusClassName(status) {
    return STATUS_CLASS[status] || "is-completed";
}

function RecentCalls() {

    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {

        async function fetchCalls() {

            try {

                const data = await getRecentCalls();

                setCalls(data);

            }

            catch (error) {

                console.error("Recent Calls Error:", error);
                setError(error.message || "Unable to load call history.");
            } finally {
                setLoading(false);

            }

        }

        fetchCalls();

    }, []);

    const entries = useMemo(() => calls, [calls]);

    return (

        <div className="dashboard-card call-log">

            <div className="card-header">

                <h2>
                    Call History
                </h2>

                <span>
                    {entries.length} {entries.length === 1 ? "call" : "calls"}
                </span>

            </div>

            {loading ? (
                <p className="dashboard-state">Loading call history…</p>
            ) : error ? (
                <p className="dashboard-state error">{error}</p>
            ) : entries.length === 0 ? (
                <p className="dashboard-state">No previous calls found.</p>
            ) : (
                <ul className="call-log-list">
                    {entries.map((entry) => {

                        const isOutgoing = entry.direction === "Outgoing";

                        return (
                            <li
                                className={`call-log-row ${isOutgoing ? "is-outgoing" : "is-incoming"}`}
                                key={entry.id}
                            >

                                <div
                                    className={`call-direction-icon ${isOutgoing ? "is-outgoing" : "is-incoming"}`}
                                    aria-hidden="true"
                                >
                                    {isOutgoing ? <FiPhoneOutgoing /> : <FiPhoneIncoming />}
                                </div>

                                <div className="call-log-main">

                                    <span className={`call-type-badge ${isOutgoing ? "is-outgoing" : "is-incoming"}`}>
                                        {entry.direction}
                                    </span>

                                    <dl className="call-log-details">

                                        <div className="call-log-detail-row">
                                            <dt>Caller</dt>
                                            <dd>{entry.caller}</dd>
                                        </div>

                                        <div className="call-log-detail-row">
                                            <dt>Receiver</dt>
                                            <dd>{entry.receiver}</dd>
                                        </div>

                                        <div className="call-log-detail-row">
                                            <dt>Type</dt>
                                            <dd className="call-mode">
                                                {entry.mode === "Video" ? <FiVideo /> : <FiMic />}
                                                {entry.mode === "Video" ? "Video Call" : "Audio Call"}
                                            </dd>
                                        </div>

                                        <div className="call-log-detail-row">
                                            <dt>Status</dt>
                                            <dd>
                                                <span className={`call-status-badge ${statusClassName(entry.status)}`}>
                                                    {entry.status}
                                                </span>
                                            </dd>
                                        </div>

                                        <div className="call-log-detail-row">
                                            <dt>Duration</dt>
                                            <dd className="call-log-duration">
                                                <FiClock />
                                                {entry.duration}
                                            </dd>
                                        </div>

                                        <div className="call-log-detail-row">
                                            <dt>Date</dt>
                                            <dd>{entry.date}</dd>
                                        </div>

                                        <div className="call-log-detail-row">
                                            <dt>Time</dt>
                                            <dd>{entry.time}</dd>
                                        </div>

                                    </dl>

                                </div>

                            </li>
                        );

                    })}
                </ul>
            )}

        </div>

    );

}

export default RecentCalls;
