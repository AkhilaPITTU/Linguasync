import "./Participants.css";

const Participants = ({ participants = [] }) => {

    return (

        <div className="participants">

            <div className="participants-header">

                <h3>Participants</h3>

                <span>{participants.length}</span>

            </div>

            {
                participants.length === 0 ? (

                    <div className="no-participants">

                        <p>No participants yet.</p>

                    </div>

                ) : (

                    participants.map((user) => (

                        <div
                            key={user.id}
                            className="participant-card"
                        >

                            <div className="participant-left">

                                <div className="avatar">

                                    {user.name
                                        ? user.name.charAt(0).toUpperCase()
                                        : "?"}

                                </div>

                                <div>

                                    <h4>

                                        {user.country || "🌍"} {user.name}

                                        {user.local && (

                                            <span className="you-tag">

                                                You

                                            </span>

                                        )}

                                    </h4>

                                    <p>

                                        {user.language || "English"}

                                    </p>

                                </div>

                            </div>

                            <div className="participant-right">

                                <span
                                    className={
                                        user.mic === false
                                            ? "status-off"
                                            : "status-on"
                                    }
                                >
                                    🎤
                                </span>

                                <span
                                    className={
                                        user.camera === false
                                            ? "status-off"
                                            : "status-on"
                                    }
                                >
                                    📷
                                </span>

                            </div>

                        </div>

                    ))

                )
            }

        </div>

    );

};

export default Participants;