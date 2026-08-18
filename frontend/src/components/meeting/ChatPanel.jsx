import { useState } from "react";
import "./ChatPanel.css";

import websocketService from "../../services/websocketService";

const ChatPanel = ({ messages = [] }) => {

    const [message, setMessage] = useState("");
    const [sendError, setSendError] = useState("");

    const userName = localStorage.getItem("user_name");
    const rawUserId = localStorage.getItem("user_id") || "";
    const userId = rawUserId.includes(":")
        ? rawUserId.split(":")[0]
        : rawUserId;

    const sendMessage = () => {

        if (!message.trim()) return;

        const sent = websocketService.send({

            type: "chat",

            user_id: userId,

            name: userName,

            text: message.trim(),

            // This is only a source-language hint for typed text. The
            // backend still uses the sender's persisted meeting setting if
            // the browser cannot provide one.
            source_language: navigator.language?.split("-")[0],

            time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            }),

        });

        if (!sent) {
            setSendError("Chat is disconnected. Reconnect to the meeting and try again.");
            return;
        }

        setMessage("");
        setSendError("");

    };

    return (

        <div className="chat-panel">

            <div className="chat-header">

                <h3>Meeting Chat</h3>

            </div>

            <div className="chat-messages">

                {
                    messages.length === 0 ? (

                        <div className="empty-chat">

                            No messages yet.

                        </div>

                    ) : (

                        messages.map((msg, index) => (

                            <div
                                key={msg.message_id || msg.id || index}
                                className={`chat-card ${
                                    msg.user_id === userId
                                        ? "my-message"
                                        : ""
                                }`}
                            >

                                <div className="chat-top">

                                    <span className="chat-name">

                                        {(msg.country || "🌍")} {msg.name || "Unknown"}

                                    </span>

                                    <span className="chat-time">

                                        {msg.time || ""}

                                    </span>

                                </div>

                                <p>

                                    {msg.text || msg.message}

                                </p>

                            </div>

                        ))

                    )
                }

            </div>

            <div className="chat-input">

                {sendError && (
                    <p className="chat-send-error" role="alert">{sendError}</p>
                )}

                <input
                    type="text"
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => {
                        setMessage(e.target.value);
                        setSendError("");
                    }}
                    onKeyDown={(e) => {

                        if (e.key === "Enter") {

                            sendMessage();

                        }

                    }}
                />

                <button onClick={sendMessage}>

                    Send

                </button>

            </div>

        </div>

    );

};

export default ChatPanel;
