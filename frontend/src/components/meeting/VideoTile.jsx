import "./VideoTile.css";

import { useEffect, useRef } from "react";

const VideoTile = ({ participant }) => {

    const videoRef = useRef(null);

    useEffect(() => {

        if (
            videoRef.current &&
            participant.stream
        ) {

            videoRef.current.srcObject =
                participant.stream;

        }

    }, [participant.stream]);

    return (

        <div
            className={`video-tile ${
                participant.local ? "you-border" : ""
            }`}
        >

            {
                participant.stream ? (

                    <video
                        ref={videoRef}
                        className="participant-video"
                        autoPlay
                        playsInline
                        muted={participant.local}
                    />

                ) : (

                    <div className="video-placeholder">

                        <div className="avatar">

                            {participant.name
                                ? participant.name
                                      .charAt(0)
                                      .toUpperCase()
                                : "?"}

                        </div>

                    </div>

                )
            }

            <div className="tile-header">

                <div className="participant-info">

                    <span className="country">
                        {participant.country || "🌍"}
                    </span>

                    <span className="participant-name">
                        {participant.name}
                    </span>

                    {participant.local && (

                        <span className="you-badge">

                            You

                        </span>

                    )}

                    <span className="language-badge">

                        {participant.language || "English"}

                    </span>

                </div>

                {participant.speaking && (

                    <div className="speaking-indicator">

                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>

                    </div>

                )}

            </div>

            {participant.subtitle && (

                <div className="subtitle-box">

                    <p>{participant.subtitle}</p>

                </div>

            )}

        </div>

    );

};

export default VideoTile;