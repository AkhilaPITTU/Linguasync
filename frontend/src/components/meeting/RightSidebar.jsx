import { useEffect, useRef, useState } from "react";
import "./RightSidebar.css";

import Participants from "./Participants";
import TranscriptPanel from "./TranscriptPanel";
import ChatPanel from "./ChatPanel";
import LanguageSettings from "./LanguageSettings";
import ExportPanel from "./ExportPanel";
import { resolveSpeakerName } from "./speakerName";

const RightSidebar = ({
    participants = [],
    transcript = [],
    translations = [],
    chatMessages = [],
    language = "English",
    sourceLanguage = "English",
    outputMode = "none",
    setLanguage = () => {},
    setSourceLanguage = () => {},
    onPreferencesSave = async () => {},
    currentUserId,
    onCorrectTranscript = () => {},
}) => {

    const [activeTab, setActiveTab] = useState("participants");
    const transcriptCountRef = useRef(transcript.length);
    const translationCountRef = useRef(translations.length);

    // MeetingRoom updates these arrays from WebSocket events. Follow the
    // newest real-time content without creating a second socket/data path.
    useEffect(() => {

        if (transcript.length > transcriptCountRef.current) {
            setActiveTab("transcript");
        }

        transcriptCountRef.current = transcript.length;

    }, [transcript.length]);

    useEffect(() => {

        if (translations.length > translationCountRef.current) {
            setActiveTab("translation");
        }

        translationCountRef.current = translations.length;

    }, [translations.length]);

    const latestTranslations = translations.filter(
        (item) => typeof item.text === "string" && item.text.trim()
    );

    return (

        <div className="right-sidebar">

            <div className="sidebar-tabs">

                <button
                    className={activeTab === "participants" ? "active" : ""}
                    onClick={() => setActiveTab("participants")}
                >
                    Participants
                </button>

                <button
                    className={activeTab === "transcript" ? "active" : ""}
                    onClick={() => setActiveTab("transcript")}
                >
                    Transcript
                </button>

                <button
                    className={activeTab === "translation" ? "active" : ""}
                    onClick={() => setActiveTab("translation")}
                >
                    Translation
                </button>

                <button
                    className={activeTab === "chat" ? "active" : ""}
                    onClick={() => setActiveTab("chat")}
                >
                    Chat
                </button>

                <button
                    className={activeTab === "language" ? "active" : ""}
                    onClick={() => setActiveTab("language")}
                >
                    Language
                </button>

                <button
                    className={activeTab === "export" ? "active" : ""}
                    onClick={() => setActiveTab("export")}
                >
                    Export
                </button>

            </div>

            <div className="sidebar-content">

                {activeTab === "participants" && (
                    <Participants
                        participants={participants}
                    />
                )}

                {activeTab === "transcript" && (
                    <TranscriptPanel
                        transcript={transcript}
                        participants={participants}
                        translations={translations}
                        currentUserId={currentUserId}
                        onCorrectTranscript={onCorrectTranscript}
                    />
                )}

                {activeTab === "translation" && (
                    <div className="live-translation-panel">

                        <div className="live-translation-header">
                            <h3>Live Translation</h3>
                            <span>{latestTranslations.length}</span>
                        </div>

                        {latestTranslations.length === 0 ? (
                            <div className="empty-live-translation">
                                <p>
                                    Translated subtitles will appear here in real time.
                                </p>
                            </div>
                        ) : (
                            latestTranslations.map((item, index) => (
                                <article
                                    className="live-translation-card"
                                    key={item.chunk_id || `${item.user_id}-${index}`}
                                >
                                    <div className="live-translation-meta">
                                        <div className="live-translation-speaker">
                                            <strong>
                                                {resolveSpeakerName(item, participants)}
                                            </strong>
                                            <span>
                                                {item.target_language || "Translation"}
                                            </span>
                                        </div>
                                        <small>
                                            {item.output_mode === "subtitle_voice"
                                                ? "Subtitles + voice"
                                                : "Subtitle"}
                                        </small>
                                    </div>
                                    <p>{item.text}</p>
                                </article>
                            ))
                        )}

                    </div>
                )}

                {activeTab === "chat" && (
                    <ChatPanel
                        messages={chatMessages}
                    />
                )}

                {activeTab === "language" && (
                    <LanguageSettings
                        language={language}
                        sourceLanguage={sourceLanguage}
                        outputMode={outputMode}
                        setLanguage={setLanguage}
                        setSourceLanguage={setSourceLanguage}
                        onPreferencesSave={onPreferencesSave}
                    />
                )}

                {activeTab === "export" && (
                    <ExportPanel
                        transcript={transcript}
                        translations={translations}
                        chatMessages={chatMessages}
                    />
                )}

            </div>

        </div>

    );

};

export default RightSidebar;
