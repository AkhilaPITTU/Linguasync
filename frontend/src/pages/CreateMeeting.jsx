import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createMeeting } from "../services/meetingService";
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

                alert("Unable to create meeting.");
                return;

            }

            const meetingId = response.meeting.meeting_id;

            localStorage.setItem("meeting_id", meetingId);

            const outputModePreferences = {
                original: "none",
                text: "subtitle",
                speech: "voice",
                translated_speech: "voice",
                text_speech: "subtitle_voice",
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

                alert(
                    error.response.data.detail ||
                    "Unable to create meeting."
                );

            } else {

                alert("Server is not responding.");

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
                            translated speech.

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
                        <option>Hindi</option>
                        <option>Telugu</option>
                        <option>Tamil</option>
                        <option>Kannada</option>
                        <option>Malayalam</option>
                        <option>French</option>
                        <option>German</option>
                        <option>Spanish</option>

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
                                        outputMode === "translated_speech"
                                            ? "mode-card active"
                                            : "mode-card"
                                    }
                                    onClick={() =>
                                        setOutputMode("translated_speech")
                                    }
                                >
                                    <div className="mode-icon">🔊</div>

                                    <div>

                                        <h4>Translated Speech</h4>

                                        <p>

                                            Hear translated audio
                                            in your language

                                        </p>

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

                                <div
                                    className={
                                        outputMode === "speech"
                                            ? "mode-card active"
                                            : "mode-card"
                                    }
                                    onClick={() =>
                                        setOutputMode("speech")
                                    }
                                >
                                    <div className="mode-icon">
                                        🔊
                                    </div>

                                    <div>

                                        <h4>

                                            Translated Speech

                                        </h4>

                                        <p>

                                            Hear translated voice

                                        </p>

                                    </div>

                                </div>

                                <div
                                    className={
                                        outputMode === "text_speech"
                                            ? "mode-card active"
                                            : "mode-card"
                                    }
                                    onClick={() =>
                                        setOutputMode("text_speech")
                                    }
                                >
                                    <div className="mode-icon">
                                        ✨
                                    </div>

                                    <div>

                                        <h4>

                                            Text + Speech

                                        </h4>

                                        <p>

                                            Subtitle +
                                            translated voice

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
