import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

import websocketService from "../services/websocketService";
import webrtcService from "../services/webrtcService";

function Meeting() {

    const { meetingId } = useParams();

    const localVideoRef = useRef(null);

    useEffect(() => {

        const userId = localStorage.getItem("user_id");

        if (!meetingId || !userId) {
            console.error("Meeting ID or User ID not found");
            return;
        }

        websocketService.connect(
            meetingId,
            userId,
            async (data) => {

                console.log("WebSocket:", data);

                switch (data.type) {

                    case "user_joined":
                        console.log("User Joined:", data.user_id);
                        break;

                    case "offer":
                        await webrtcService.createPeerConnection(
                            data.from,
                            () => {}
                        );

                        await webrtcService.createAnswer(
                            data.from,
                            data.offer
                        );
                        break;

                    case "answer":
                        await webrtcService.setRemoteAnswer(
                            data.answer
                        );
                        break;

                    case "ice_candidate":
                        await webrtcService.addIceCandidate(
                            data.candidate
                        );
                        break;

                    case "chat":
                        console.log(data.message);
                        break;

                    case "translation":
                        console.log(data.text);
                        break;

                    case "error":
                        console.error(data.message);
                        break;

                    default:
                        break;
                }

            }
        );

        async function initializeMeeting() {

            try {

                const stream =
                    await webrtcService.startLocalStream();

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

            } catch (err) {
                console.error(err);
            }

        }

        initializeMeeting();

        return () => {

            websocketService.disconnect();

            webrtcService.closeConnection();

        };

    }, [meetingId]);

    return (

        <div>

            <h2>Meeting Room</h2>

            <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                width="500"
            />

        </div>

    );

}

export default Meeting;