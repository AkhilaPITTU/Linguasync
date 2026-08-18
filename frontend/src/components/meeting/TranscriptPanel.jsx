import { useState } from "react";
import "./TranscriptPanel.css";
import { resolveSpeakerName } from "./speakerName";

const TranscriptPanel = ({
    transcript = [],
    currentUserId,
    participants = [],
    onCorrectTranscript = () => {},
}) => {

    const [editingChunkId, setEditingChunkId] = useState(null);
    const [draft, setDraft] = useState("");

    const startEditing = (item) => {
        setEditingChunkId(item.chunk_id);
        setDraft(item.text || "");
    };

    const saveCorrection = (item) => {
        const correctedText = draft.trim();
        if (!correctedText) return;
        onCorrectTranscript(item, correctedText);
        setEditingChunkId(null);
        setDraft("");
    };

    return (

        <div className="transcript-panel">

            <div className="transcript-header">

                <h3>Live Transcript</h3>

            </div>

            <div className="transcript-list">

                {
                    transcript.length === 0 ? (

                        <div className="empty-transcript">

                            <p>No transcript available yet.</p>

                        </div>

                    ) : (

                        transcript.map((item, index) => (

                            <div
                                className="transcript-card"
                                key={item.chunk_id || item.id || index}
                            >

                                <div className="transcript-top">

                                    <div className="speaker">

                                        <span>

                                            {item.country || "🌍"}

                                        </span>

                                        <strong>

                                            {resolveSpeakerName(item, participants)}

                                        </strong>

                                    </div>

                                    <span className="time">

                                        {item.time || ""}

                                    </span>

                                </div>

                                {editingChunkId === item.chunk_id ? (
                                    <div className="transcript-edit">
                                        <textarea
                                            value={draft}
                                            onChange={(event) => setDraft(event.target.value)}
                                            maxLength={2000}
                                        />
                                        <button
                                            onClick={() => saveCorrection(item)}
                                            disabled={!draft.trim()}
                                        >
                                            Save
                                        </button>
                                        <button onClick={() => setEditingChunkId(null)}>
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <p>{item.text || ""}</p>
                                        {item.is_corrected && (
                                            <small className="transcript-edited">(edited)</small>
                                        )}
                                        {item.user_id === currentUserId && item.correctable !== false && (
                                            <button
                                                className="transcript-edit-button"
                                                onClick={() => startEditing(item)}
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </>
                                )}

                            </div>

                        ))

                    )
                }

            </div>

        </div>

    );

};

export default TranscriptPanel;
