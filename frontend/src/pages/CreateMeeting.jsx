import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createMeeting } from "../services/meetingService";
import { showToast } from "../components/notification/toastService";
import "./CreateMeeting.css";

function CreateMeeting() {

    const navigate = useNavigate();

    const [meetingType, setMeetingType] = useState("video");
    const [language, setLanguage] = useState("English");

    // Audio:
    // original | translated_speech
    //
    // Video:
    // original
    // text
    // speech
    // text_speech
    const [outputMode, setOutputMode] = useState("original");

    const [loading, setLoading] = useState(false);

    const handleCreateMeeting = async () => {

        try {

            setLoading(true);

            const response = await createMeeting({

                meeting_type: meetingType,

                preferred_language: language,

                output_mode: outputMode

            });

            if (
                !response ||
                !response.success ||
                !response.meeting
            ) {

                showToast("Unable to create meeting.", "error");
                return;

            }

            const meetingId = response.meeting.meeting_id;

            localStorage.setItem("meeting_id", meetingId);

            const outputModePreferences = {
                original: "none",
                text: "subtitle",
            };

            navigate(`/meeting/${meetingId}`, {
                state: {
                    joinPreferences: {
                        preferred_language: language,
                        output_mode:
                            outputModePreferences[outputMode] ||
                            "none",
                    },
                },
            });

        } catch (error) {

            console.error(error);

            if (error.response) {

                showToast(
                    error.response.data.detail ||
                    "Unable to create meeting.",
                    "error",
                );

            } else {

                showToast("Server is not responding.", "error");

            }

        } finally {

            setLoading(false);

        }

    };

    return (

        <div className="create-page">

            <div className="create-card">

                <h1>Create Meeting</h1>

                <p className="subtitle">

                    Create a multilingual audio or video meeting.

                </p>

                <h3 className="section-title">

                    Select Meeting Type

                </h3>

                <div className="meeting-options">

                    <div
                        className={
                            meetingType === "audio"
                                ? "meeting-box active"
                                : "meeting-box"
                        }
                        onClick={() => {

                            setMeetingType("audio");
                            setOutputMode("original");

                        }}
                    >

                        <div className="meeting-icon">
                            🎧
                        </div>

                        <h3>Audio Call</h3>

                        <p>

                            Voice communication with optional
                            translated subtitles.

                        </p>

                    </div>

                    <div
                        className={
                            meetingType === "video"
                                ? "meeting-box active"
                                : "meeting-box"
                        }
                        onClick={() => {

                            setMeetingType("video");
                            setOutputMode("original");

                        }}
                    >

                        <div className="meeting-icon">
                            📹
                        </div>

                        <h3>Video Call</h3>

                        <p>

                            Video meeting with multiple
                            translation modes.

                        </p>

                    </div>

                </div>

                <div className="form-group">

                    <label>

                        🌐 My Preferred Language

                    </label>

                    <select
                        value={language}
                        onChange={(e) =>
                            setLanguage(e.target.value)
                        }
                    >

                        <option>English</option>
                        <option>Telugu</option>
                        <option>Hindi</option>
                        <option>Tamil</option>
                        <option>Kannada</option>
                        <option>Malayalam</option>
                        <option>Bengali</option>
                        <option>Marathi</option>
                        <option>Gujarati</option>
                        <option>Punjabi</option>
                        <option>Urdu</option>
                        <option>Odia</option>

                    </select>

                </div>

                {/* AUDIO OPTIONS */}

                {
                    meetingType === "audio" && (

                        <div className="form-group">

                            <label>

                                🎵 Output Mode

                            </label>

                                                        <div className="mode-container">

                                <div
                                    className={
                                        outputMode === "original"
                                            ? "mode-card active"
                                            : "mode-card"
                                    }
                                    onClick={() =>
                                        setOutputMode("original")
                                    }
                                >
                                    <div className="mode-icon">🎤</div>

                                    <div>

                                        <h4>Original Voice</h4>

                                        <p>No Translation</p>

                                    </div>

                                </div>

                                <div
                                    className={
                                        outputMode === "text"
                                            ? "mode-card active"
                                            : "mode-card"
                                    }
                                    onClick={() =>
                                        setOutputMode("text")
                                    }
                                >
                                    <div className="mode-icon">📝</div>

                                    <div>

                                        <h4>Translated Subtitles</h4>

                                        <p>Show translated subtitles</p>

                                    </div>

                                </div>

                            </div>

                        </div>

                    )
                }

                {/* VIDEO OPTIONS */}

                {
                    meetingType === "video" && (

                        <div className="form-group">

                            <label>

                                📤 Output Mode

                            </label>

                            <div className="mode-container">

                                <div
                                    className={
                                        outputMode === "original"
                                            ? "mode-card active"
                                            : "mode-card"
                                    }
                                    onClick={() =>
                                        setOutputMode("original")
                                    }
                                >
                                    <div className="mode-icon">
                                        🎤
                                    </div>

                                    <div>

                                        <h4>

                                            Original Voice

                                        </h4>

                                        <p>

                                            Normal video call

                                        </p>

                                    </div>

                                </div>

                                <div
                                    className={
                                        outputMode === "text"
                                            ? "mode-card active"
                                            : "mode-card"
                                    }
                                    onClick={() =>
                                        setOutputMode("text")
                                    }
                                >
                                    <div className="mode-icon">
                                        📝
                                    </div>

                                    <div>

                                        <h4>

                                            Translated Text

                                        </h4>

                                        <p>

                                            Hear original voice +
                                            translated subtitles

                                        </p>

                                    </div>

                                </div>

                            </div>

                        </div>

                    )
                }
                                <button
                    className="create-btn"
                    onClick={handleCreateMeeting}
                    disabled={loading}
                >
                    {loading
                        ? "Creating..."
                        : meetingType === "audio"
                        ? "🎧 Create Audio Meeting"
                        : "📹 Create Video Meeting"}
                </button>

            </div>

        </div>

    );

}

export default CreateMeeting;
