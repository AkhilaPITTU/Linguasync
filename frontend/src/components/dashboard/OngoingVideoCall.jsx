import "./OngoingVideoCall.css";

import {
    FiVideo,
    FiMic,
    FiMonitor,
    FiPhoneCall,
    FiClock,
    FiGlobe
} from "react-icons/fi";

function OngoingVideoCall() {

    return (

        <div className="ongoing-call">

            <div className="call-header">

                <div>

                    <span className="live-badge">

                        ● LIVE

                    </span>

                </div>

                <div className="call-duration">

                    <FiClock />

                    00:18:42

                </div>

            </div>

            <div className="participants">

                <img src="/images/user.png" alt="user"/>

                <img src="/images/user.png" alt="user"/>

                <img src="/images/user.png" alt="user"/>

                <img src="/images/user.png" alt="user"/>

            </div>

            <h2>

                Ongoing Video Call

            </h2>

            <p>

                English ⇄ Telugu

            </p>

            <div className="translation-status">

                <FiGlobe />

                Translation Running

            </div>

            <div className="call-controls">

                <button>

                    <FiMic />

                </button>

                <button>

                    <FiVideo />

                </button>

                <button>

                    <FiMonitor />

                </button>

            </div>

            <button className="join-call">

                <FiPhoneCall />

                Open Video Call

            </button>

        </div>

    );

}

export default OngoingVideoCall;