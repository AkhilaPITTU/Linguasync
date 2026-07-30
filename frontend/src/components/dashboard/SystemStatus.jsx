import "./SystemStatus.css";

import { useEffect, useState } from "react";

import { getSystemStatus } from "../../services/systemStatusService";

import {
    FiServer,
    FiDatabase,
    FiWifi,
    FiMic,
    FiShield,
    FiActivity,
    FiCpu
} from "react-icons/fi";

function SystemStatus() {

    const [status, setStatus] = useState({});

    useEffect(() => {

        async function fetchStatus() {

            try {

                const data = await getSystemStatus();

                setStatus(data);

            }

            catch (error) {

                console.error("System Status Error:", error);

            }

        }

        fetchStatus();

    }, []);

    const services = [

        {
            id: 1,
            name: "FastAPI Server",
            status: status.server_status || "Offline",
            icon: <FiServer />,
            color: "#22C55E"
        },

        {
            id: 2,
            name: "MongoDB",
            status: status.database || "Disconnected",
            icon: <FiDatabase />,
            color: "#2563EB"
        },

        {
            id: 3,
            name: "Translation Engine",
            status: status.translation_engine || "Stopped",
            icon: <FiCpu />,
            color: "#06B6D4"
        },

        {
            id: 4,
            name: "Speech Recognition",
            status: status.speech_recognition || "Inactive",
            icon: <FiMic />,
            color: "#7C3AED"
        },

        {
            id: 5,
            name: "Voice Clone",
            status: status.voice_clone || "Unavailable",
            icon: <FiShield />,
            color: "#F59E0B"
        }

    ];

    return (

        <div className="dashboard-card system-status">

            <div className="card-header">

                <h2>

                    System Status

                </h2>

                <span className="live-tag">

                    LIVE

                </span>

            </div>

            {

                services.map((service) => (

                    <div
                        key={service.id}
                        className="service-card"
                    >

                        <div
                            className="service-icon"
                            style={{
                                background: service.color
                            }}
                        >

                            {service.icon}

                        </div>

                        <div className="service-info">

                            <h3>

                                {service.name}

                            </h3>

                            <p>

                                {service.status}

                            </p>

                        </div>

                        <div className="status-dot"></div>

                    </div>

                ))

            }

            <div className="server-health">

                <FiActivity />

                <div>

                    <small>

                        API Latency

                    </small>

                    <h3>

                        {status.api_latency || "0 ms"}

                    </h3>

                </div>

            </div>

        </div>

    );

}

export default SystemStatus;