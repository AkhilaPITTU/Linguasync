import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { createMeeting } from "../services/meetingService";

import "./CreateMeeting.css";

function CreateMeeting() {

    const navigate = useNavigate();

    const [meetingType, setMeetingType] = useState("video");
    const [language, setLanguage] = useState("English");
    const [loading, setLoading] = useState(false);

    const handleCreateMeeting = async () => {

        try {

            setLoading(true);

            const response = await createMeeting({
                meeting_type: meetingType,
                target_language: language
            });

            console.log("Create Meeting Response:", response);

            if (
                !response ||
                !response.success ||
                !response.meeting
            ) {
                alert("Unable to create meeting.");
                return;
            }

            const meetingId = response.meeting.meeting_id;

            // Save meeting id
            localStorage.setItem("meeting_id", meetingId);

            // Navigate to Meeting Room
            navigate(`/meeting/${meetingId}`);

        } catch (error) {

            console.error("Create Meeting Error:", error);

            if (error.response) {
                console.error(error.response.data);
                alert(error.response.data.detail || "Unable to create meeting.");
            } else {
                alert("Server is not responding.");
            }

        } finally {

            setLoading(false);

        }

    };

    return (

        <div className="create-meeting-page">

            <div className="create-card">

                <h1>Create Meeting</h1>

                <label>Meeting Type</label>

                <select
                    value={meetingType}
                    onChange={(e) => setMeetingType(e.target.value)}
                >
                    <option value="video">Video Meeting</option>
                    <option value="audio">Audio Meeting</option>
                </select>

                <label>Target Language</label>

                <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Telugu">Telugu</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Kannada">Kannada</option>
                    <option value="Malayalam">Malayalam</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Spanish">Spanish</option>
                </select>

                <button
                    onClick={handleCreateMeeting}
                    disabled={loading}
                >
                    {loading ? "Creating..." : "Create Meeting"}
                </button>

            </div>

        </div>

    );

}

export default CreateMeeting;