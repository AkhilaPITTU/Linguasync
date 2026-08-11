import "./VideoTile.css";
import { useEffect, useRef } from "react";

const VideoTile = ({ participant }) => {

    const videoRef = useRef(null);

    useEffect(() => {

        const video = videoRef.current;

        if (!video) {
            return;
        }

        if (!participant.stream) {
            return;
        }

        console.log(
            "========== VIDEO TILE =========="
        );

        console.log(
            "Participant:",
            participant.name
        );

        console.log(
            "Local:",
            participant.local
        );

        console.log(
            "Remote Stream:",
            participant.stream
        );


        // ==========================================
        // CHECK AUDIO TRACKS
        // ==========================================

        const audioTracks =
            participant.stream.getAudioTracks();

        console.log(
            "AUDIO TRACKS:",
            audioTracks
        );

        audioTracks.forEach((track) => {

            console.log(
                "AUDIO TRACK:",
                {
                    enabled: track.enabled,
                    muted: track.muted,
                    readyState: track.readyState
                }
            );

        });


        // ==========================================
        // CHECK VIDEO TRACKS
        // ==========================================

        const videoTracks =
            participant.stream.getVideoTracks();

        console.log(
            "VIDEO TRACKS:",
            videoTracks
        );


        // ==========================================
        // ATTACH WEBRTC STREAM
        // ==========================================

        video.srcObject =
            participant.stream;


        // ==========================================
        // LOCAL VIDEO = MUTED
        // REMOTE VIDEO = SOUND ENABLED
        // ==========================================

        video.muted =
            Boolean(participant.local);


        // ==========================================
        // SET VOLUME
        // ==========================================

        video.volume = 1.0;


        // ==========================================
        // PLAY VIDEO + AUDIO
        // ==========================================

        const startPlayback = async () => {

            try {

                await video.play();

                console.log(
                    "✅ Video/Audio playback started:",
                    participant.name
                );

            } catch (error) {

                console.warn(
                    "⚠️ Video/Audio playback failed:",
                    error
                );

            }

        };

        startPlayback();


        // ==========================================
        // AUDIO TRACK STATE CHANGES
        // ==========================================

        audioTracks.forEach((track) => {

            track.onunmute = () => {

                console.log(
                    "🔊 Remote audio unmuted:",
                    participant.name
                );

                startPlayback();

            };

            track.onmute = () => {

                console.log(
                    "🔇 Remote audio muted:",
                    participant.name
                );

            };

            track.onended = () => {

                console.log(
                    "❌ Remote audio ended:",
                    participant.name
                );

            };

        });


        // ==========================================
        // CLEANUP
        // ==========================================

        return () => {

            audioTracks.forEach((track) => {

                track.onunmute = null;
                track.onmute = null;
                track.onended = null;

            });

        };

    }, [
        participant.stream,
        participant.local,
        participant.name
    ]);


    return (

        <div
            className={`video-tile ${
                participant.local
                    ? "you-border"
                    : ""
            }`}
        >

            {participant.stream ? (

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
                            : "?"
                        }

                    </div>

                </div>

            )}


            {/* ======================================
                PARTICIPANT INFORMATION
            ====================================== */}

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


                {/* ==================================
                    SPEAKING INDICATOR
                ================================== */}

                {participant.speaking && (

                    <div className="speaking-indicator">

                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>

                    </div>

                )}

            </div>


            {/* ======================================
                SUBTITLE
            ====================================== */}

            {participant.subtitle && (

                <div className="subtitle-box">

                    <p>
                        {participant.subtitle}
                    </p>

                </div>

            )}

        </div>

    );
};

export default VideoTile;