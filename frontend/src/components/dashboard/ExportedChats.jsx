import "./ExportedChats.css";

import { useEffect, useState } from "react";
import { FiCalendar, FiFileText } from "react-icons/fi";

import { getExportedChats } from "../../services/exportedChatsService";

function ExportedChats() {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        getExportedChats()
            .then((data) => {
                if (active) setFiles(data);
            })
            .catch((requestError) => {
                console.error("Chat History Error:", requestError);
                if (active) setError(requestError.message || "Unable to load chat history.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    return (
        <div className="dashboard-card exported-chats">
            <div className="card-header">
                <h2>Chat History</h2>
                <span>{files.length} saved</span>
            </div>

            {loading ? (
                <p className="dashboard-state">Loading chat history…</p>
            ) : error ? (
                <p className="dashboard-state error">{error}</p>
            ) : files.length === 0 ? (
                <p className="dashboard-state">No saved chat messages found.</p>
            ) : files.map((file) => (
                <article key={file.id} className="export-card">
                    <div className="export-left">
                        <div className="file-icon"><FiFileText /></div>
                        <div>
                            <h3>{file.sender_name}</h3>
                            <p>Meeting {file.meeting_id}</p>
                            <p className="chat-history-text">{file.text}</p>
                            <small><FiCalendar /> {file.created_at}</small>
                        </div>
                    </div>
                </article>
            ))}
        </div>
    );
}

export default ExportedChats;
