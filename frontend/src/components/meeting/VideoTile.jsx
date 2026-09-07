import "./VideoTile.css";
import { useEffect, useRef } from "react";

const VideoTile = ({ participant, remoteAudioMuted = false }) => {

    const videoRef = useRef(null);

    const hasVideo =
        participant.stream &&
        participant.stream.getVideoTracks().length > 0;

    const hasAudio =
        participant.stream &&
        participant.stream.getAudioTracks().length > 0;

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
            "Has Video:",
            hasVideo
        );

        console.log(
            "Has Audio:",
            hasAudio
        );

        const audioTracks =
            participant.stream.getAudioTracks();

        const videoTracks =
            participant.stream.getVideoTracks();

        console.log(
            "AUDIO TRACKS:",
            audioTracks
        );

        console.log(
            "VIDEO TRACKS:",
            videoTracks
        );

        // ==========================================
        // ATTACH STREAM
        // ==========================================

        video.srcObject =
            participant.stream;

        // Local participant should not hear
        // their own microphone.
        video.muted = Boolean(participant.local) || remoteAudioMuted;

        video.volume = 1.0;

        // ==========================================
        // PLAY AUDIO / VIDEO
        // ==========================================

        const startPlayback = async () => {

            try {

                await video.play();

                console.log(
                    "✅ Audio/Video playback started:",
                    participant.name
                );

            } catch (error) {

                console.warn(
                    "⚠️ Playback failed:",
                    error
                );

            }

        };

        startPlayback();

        // ==========================================
        // AUDIO TRACK EVENTS
        // ==========================================

        audioTracks.forEach((track) => {

            track.onunmute = () => {

                console.log(
                    "🔊 Audio unmuted:",
                    participant.name
                );

                startPlayback();

            };

            track.onmute = () => {

                console.log(
                    "🔇 Audio muted:",
                    participant.name
                );

            };

            track.onended = () => {

                console.log(
                    "❌ Audio ended:",
                    participant.name
                );

            };

        });

        // ==========================================
        // VIDEO TRACK EVENTS
        // ==========================================

        videoTracks.forEach((track) => {

            track.onunmute = () => {

                console.log(
                    "📹 Video unmuted:",
                    participant.name
                );

                startPlayback();

            };

            track.onmute = () => {

                console.log(
                    "📹 Video muted:",
                    participant.name
                );

            };

            track.onended = () => {

                console.log(
                    "❌ Video ended:",
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

            videoTracks.forEach((track) => {

                track.onunmute = null;
                track.onmute = null;
                track.onended = null;

            });

        };

    }, [
        participant.stream,
        participant.local,
        participant.name,
        hasVideo,
        hasAudio,
        remoteAudioMuted,
    ]);

    // ==========================================
    // AUDIO CALL
    // ==========================================

    if (participant.stream && !hasVideo) {

        return (

            <div
                className={`video-tile audio-tile ${
                    participant.local
                        ? "you-border"
                        : ""
                }`}
            >

                <div className="audio-avatar">

                    <div className="avatar">

                        {participant.name
                            ? participant.name
                                .charAt(0)
                                .toUpperCase()
                            : "?"
                        }

                    </div>

                    <div className="audio-icon">
                        🎤
                    </div>

                </div>

                {/* PARTICIPANT INFORMATION */}

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

                {/* SUBTITLE */}

                {participant.subtitle && (

                    <div className="subtitle-box">

                        <p>
                            {participant.subtitle}
                        </p>

                    </div>

                )}

                {/* Hidden audio/video element.
                    It keeps remote audio playing. */}

                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={Boolean(participant.local) || remoteAudioMuted}
                    style={{
                        display: "none"
                    }}
                />

            </div>

        );
    }

    // ==========================================
    // VIDEO CALL
    // ==========================================

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
                    muted={Boolean(participant.local) || remoteAudioMuted}
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

                {/* SPEAKING INDICATOR */}

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
