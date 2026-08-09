import { useCallback, useRef, useState } from "react";

import webrtcService from "../services/webrtcService";

// Reusable hook around the webrtcService singleton.
// Handles local camera/mic capture plus mic/camera toggling.
// Peer-connection signaling (offer/answer/ice) is driven by
// MeetingContext, which listens for those events over the socket
// and calls webrtcService directly - this hook only needs to expose
// the local stream and the media controls built on top of it.

export default function useWebRTC() {

    const [localStream, setLocalStream] = useState(null);

    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);

    const startedRef = useRef(false);

    const startLocalStream = useCallback(async () => {

        if (startedRef.current && localStream) {
            return localStream;
        }

        const stream = await webrtcService.startLocalStream();

        startedRef.current = true;

        setLocalStream(stream);

        return stream;

    }, [localStream]);

    const toggleMic = useCallback(() => {

        if (!webrtcService.localStream) return;

        setMicOn((prev) => {

            const next = !prev;

            webrtcService.toggleMicrophone(next);

            return next;

        });

    }, []);

    const toggleCamera = useCallback(() => {

        if (!webrtcService.localStream) return;

        setCameraOn((prev) => {

            const next = !prev;

            webrtcService.toggleCamera(next);

            return next;

        });

    }, []);

    const endCall = useCallback(() => {

        webrtcService.closeConnection();

        startedRef.current = false;

        setLocalStream(null);
        setMicOn(true);
        setCameraOn(true);

    }, []);

    return {
        localStream,
        micOn,
        cameraOn,
        startLocalStream,
        toggleMic,
        toggleCamera,
        endCall,
    };

}