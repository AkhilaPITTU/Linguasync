import "./RecentCalls.css";

import { useEffect, useState } from "react";

import { getRecentCalls } from "../../services/recentCallsService";

import {
    FiPhone,
    FiVideo,
    FiMic,
    FiClock,
    FiFileText,
    FiPlay
} from "react-icons/fi";

function RecentCalls() {

    const [calls, setCalls] = useState([]);

    useEffect(() => {

        async function fetchCalls() {

            try {

                const data = await getRecentCalls();

                setCalls(data);

            }

            catch (error) {

                console.error("Recent Calls Error:", error);

            }

        }

        fetchCalls();

    }, []);

    return (

        <div className="dashboard-card recent-calls">

            <div className="card-header">

                <h2>

                    Recent Calls

                </h2>

                <span>

                    View All

                </span>

            </div>

            {

                calls.map((call) => (

                    <div
                        className="call-card"
                        key={call.id}
                    >

                        <div className="call-left">

                            <img
                                src="/images/user.png"
                                alt="User"
                            />

                            <div>

                                <h3>

                                    {call.name}

                                </h3>

                                <p>

                                    {

                                        call.mode === "Video"

                                            ?

                                            <>

                                                <FiVideo />

                                                Video Call

                                            </>

                                            :

                                            <>

                                                <FiMic />

                                                Audio Call

                                            </>

                                    }

                                </p>

                                <span>

                                    {call.language}

                                </span>

                            </div>

                        </div>

                        <div className="call-right">

                            <div className="call-time">

                                <FiClock />

                                {call.duration}

                            </div>

                            <small>

                                {call.time}

                            </small>

                            <div className="call-buttons">

                                <button>

                                    <FiPlay />

                                </button>

                                <button>

                                    <FiFileText />

                                </button>

                                <button>

                                    <FiPhone />

                                </button>

                            </div>

                        </div>

                    </div>

                ))

            }

        </div>

    );

}

export default RecentCalls;