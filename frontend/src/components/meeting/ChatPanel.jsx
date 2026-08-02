import { useState } from "react";
import "./ChatPanel.css";

import websocketService from "../../services/websocketService";

const ChatPanel = ({ messages = [] }) => {

    const [message, setMessage] = useState("");

    const userName = localStorage.getItem("user_name");
    const userId = localStorage.getItem("user_id");

    const sendMessage = () => {

        if (!message.trim()) return;

        websocketService.send({

            type: "chat",

            user_id: userId,

            name: userName,

            text: message,

            time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            }),

        });

        setMessage("");

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
                                key={msg.id || index}
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

                <input
                    type="text"
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) =>
                        setMessage(e.target.value)
                    }
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