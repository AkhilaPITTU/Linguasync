import "./TranscriptPanel.css";

const TranscriptPanel = ({ transcript = [] }) => {

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
                                key={item.id || index}
                            >

                                <div className="transcript-top">

                                    <div className="speaker">

                                        <span>

                                            {item.country || "🌍"}

                                        </span>

                                        <strong>

                                            {item.speaker ||
                                             item.name ||
                                             "Unknown"}

                                        </strong>

                                    </div>

                                    <span className="time">

                                        {item.time || ""}

                                    </span>

                                </div>

                                <p>

                                    {item.text || ""}

                                </p>

                            </div>

                        ))

                    )
                }

            </div>

        </div>

    );

};

export default TranscriptPanel;