import { useState } from "react";
import "./RightSidebar.css";

import Participants from "./Participants";
import TranscriptPanel from "./TranscriptPanel";
import ChatPanel from "./ChatPanel";
import LanguageSettings from "./LanguageSettings";
import ExportPanel from "./ExportPanel";

const RightSidebar = ({
    participants = [],
    transcript = [],
    translations = [],
    chatMessages = [],
    language = "English",
    setLanguage = () => {},
}) => {

    const [activeTab, setActiveTab] = useState("participants");

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
                        translations={translations}
                    />
                )}

                {activeTab === "chat" && (
                    <ChatPanel
                        messages={chatMessages}
                    />
                )}

                {activeTab === "language" && (
                    <LanguageSettings
                        language={language}
                        setLanguage={setLanguage}
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