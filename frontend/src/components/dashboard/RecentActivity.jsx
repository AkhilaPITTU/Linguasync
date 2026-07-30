import "./RecentActivity.css";

import { useEffect, useState } from "react";

import { getRecentActivity } from "../../services/recentActivityService";

import {
    FiPhone,
    FiMic,
    FiDownload,
    FiGlobe,
    FiClock,
    FiVideo,
    FiUser
} from "react-icons/fi";

function RecentActivity() {

    const [activities, setActivities] = useState([]);

    useEffect(() => {

        async function fetchActivities() {

            try {

                const data = await getRecentActivity();

                setActivities(data);

            }

            catch (error) {

                console.error("Recent Activity Error:", error);

            }

        }

        fetchActivities();

    }, []);

    const getIcon = (activity) => {

        switch (activity.activity) {

            case "Video Call Completed":
                return <FiVideo />;

            case "Audio Call Completed":
                return <FiMic />;

            case "Translation Finished":
                return <FiGlobe />;

            case "Transcript Exported":
                return <FiDownload />;

            case "Profile Updated":
                return <FiUser />;

            default:
                return <FiPhone />;

        }

    };

    const getColor = (activity) => {

        switch (activity.activity) {

            case "Video Call Completed":
                return "#2563EB";

            case "Audio Call Completed":
                return "#22C55E";

            case "Translation Finished":
                return "#F59E0B";

            case "Transcript Exported":
                return "#7C3AED";

            case "Profile Updated":
                return "#EC4899";

            default:
                return "#6B7280";

        }

    };

    return (

        <div className="dashboard-card recent-activity">

            <div className="card-header">

                <h2>

                    Recent Activity

                </h2>

                <span>

                    Latest

                </span>

            </div>

            {

                activities.map((item) => (

                    <div
                        key={item.id}
                        className="activity-item"
                    >

                        <div
                            className="activity-icon"
                            style={{
                                background: getColor(item)
                            }}
                        >

                            {getIcon(item)}

                        </div>

                        <div className="activity-info">

                            <h3>

                                {item.activity}

                            </h3>

                            <p>

                                {item.description}

                            </p>

                        </div>

                        <div className="activity-time">

                            <FiClock />

                            {item.time}

                        </div>

                    </div>

                ))

            }

        </div>

    );

}

export default RecentActivity;