import { useEffect, useRef, useState } from "react";

export default function useMediaStream() {
    const videoRef = useRef(null);

    const [stream, setStream] = useState(null);

    const [cameraOn, setCameraOn] = useState(true);

    const [micOn, setMicOn] = useState(true);

    useEffect(() => {

        const startMedia = async () => {

            try {

                const media = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });

                setStream(media);

                if (videoRef.current) {
                    videoRef.current.srcObject = media;
                }

            } catch (err) {

                console.error(err);

            }

        };

        startMedia();

        return () => {

            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

        };

    }, []);

    const toggleCamera = () => {

        if (!stream) return;

        stream.getVideoTracks().forEach(track => {
            track.enabled = !track.enabled;
        });

        setCameraOn(prev => !prev);

    };

    const toggleMic = () => {

        if (!stream) return;

        stream.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
        });

        setMicOn(prev => !prev);

    };

    return {
        videoRef,
        stream,
        cameraOn,
        micOn,
        toggleCamera,
        toggleMic
    };
}