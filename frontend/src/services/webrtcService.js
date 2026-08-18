import websocketService from "./websocketService";
import {
    getDisplayMediaSafely,
    getUserMediaSafely,
} from "./mediaDeviceService";

class WebRTCService {

    constructor() {

        this.peerConnections = {};
        this.pendingIceCandidates = {};
        this.localStream = null;

        this.configuration = {
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302",
                }
            ],
        };
    }

    // ============================================
    // LOCAL CAMERA + MICROPHONE
    // ============================================

    async startLocalStream(video = true, audio = true) {

        if (this.localStream) {
            return this.localStream;
        }

        try {

            this.localStream =
                await getUserMediaSafely({
                    video,
                    audio
                });

            console.log("LOCAL STREAM:", this.localStream);
            console.log("LOCAL VIDEO TRACKS:", this.localStream.getVideoTracks());
            console.log("LOCAL AUDIO TRACKS:", this.localStream.getAudioTracks());

            this.localStream.getAudioTracks().forEach(track => {
                console.log("MIC TRACK:", {
                    enabled: track.enabled,
                    muted: track.muted,
                    readyState: track.readyState
                });
            });

            if (this.localStream.getAudioTracks().length === 0) {
                console.warn("⚠️ No audio track captured from getUserMedia(). Mic permission or hardware issue.");
            }

            return this.localStream;

        } catch (error) {
            console.error("Camera/Microphone Error:", error.message || error);
            throw error;
        }
    }


    // ============================================
    // CREATE PEER CONNECTION
    // ============================================

    async createPeerConnection(
        targetUserId,
        onRemoteStream
    ) {

        if (this.peerConnections[targetUserId]) {
            console.log("[WEBRTC-MESH]", {
                local: "current-browser",
                remote: targetUserId,
                action: "reuse-peer",
            });
            return this.peerConnections[targetUserId];
        }

        const pc = new RTCPeerConnection(this.configuration);

        this.peerConnections[targetUserId] = pc;

        console.log("[WEBRTC-MESH]", {
            local: "current-browser",
            remote: targetUserId,
            action: "create-peer",
        });

        // ========================================
        // ADD LOCAL AUDIO + VIDEO
        // ========================================

        if (this.localStream) {

            const tracks = this.localStream.getTracks();
            console.log("Adding Local Tracks to PC for", targetUserId, ":", tracks);

            tracks.forEach(track => {
                console.log("Adding Track:", track.kind, "enabled:", track.enabled, "readyState:", track.readyState);
                pc.addTrack(track, this.localStream);
            });

        } else {
            console.warn("⚠️ createPeerConnection called but this.localStream is null — no tracks will be sent!");
        }


        // ========================================
        // RECEIVE REMOTE STREAM
        // ========================================

        pc.ontrack = (event) => {

            console.log("========== REMOTE TRACK ==========");
            console.log("From:", targetUserId);
            console.log("Track Kind:", event.track.kind);
            console.log("Track Enabled:", event.track.enabled);
            console.log("Track Muted:", event.track.muted);
            console.log("Track ReadyState:", event.track.readyState);

            const remoteStream = event.streams[0];

            if (!remoteStream) {
                console.warn("No remote stream received");
                return;
            }

            console.log("REMOTE AUDIO TRACKS:", remoteStream.getAudioTracks());
            console.log("REMOTE VIDEO TRACKS:", remoteStream.getVideoTracks());

            remoteStream.getAudioTracks().forEach(track => {
                console.log("REMOTE AUDIO:", {
                    enabled: track.enabled,
                    muted: track.muted,
                    readyState: track.readyState
                });
            });

            if (remoteStream.getAudioTracks().length === 0) {
                console.warn("⚠️ Remote stream has NO audio tracks. Sender-side negotiation problem.");
            }

            console.log("Remote Stream From:", targetUserId);

            if (onRemoteStream) {
                onRemoteStream(targetUserId, remoteStream);
            }

        };


        // ========================================
        // ICE CANDIDATE
        // ========================================

        pc.onicecandidate = (event) => {

            if (!event.candidate) return;

            console.log("ICE candidate sent to:", targetUserId);

            websocketService.send({
                type: "ice_candidate",
                target: targetUserId,
                candidate: event.candidate
            });

        };


        // ========================================
        // CONNECTION STATE
        // ========================================

        pc.onconnectionstatechange = () => {

            console.log("[WEBRTC-MESH]", {
                local: "current-browser",
                remote: targetUserId,
                state: pc.connectionState,
            });

            if (
                pc.connectionState === "failed" ||
                pc.connectionState === "closed" ||
                pc.connectionState === "disconnected"
            ) {
                delete this.peerConnections[targetUserId];
            }

        };

        pc.oniceconnectionstatechange = () => {
            console.log("ICE State:", targetUserId, pc.iceConnectionState);
        };

        // Log what the SDP actually negotiated for audio, once
        // stable. This tells us if the m=audio line was even
        // included/accepted on both ends.
        pc.onsignalingstatechange = () => {

            console.log("Signaling State:", targetUserId, pc.signalingState);

            if (pc.signalingState === "stable" && pc.currentLocalDescription) {

                const hasAudioLocal =
                    pc.currentLocalDescription.sdp.includes("m=audio");
                const hasAudioRemote =
                    pc.currentRemoteDescription
                        ? pc.currentRemoteDescription.sdp.includes("m=audio")
                        : false;

                console.log(
                    "SDP has audio — local:", hasAudioLocal,
                    "remote:", hasAudioRemote,
                    "(peer:", targetUserId, ")"
                );

            }

        };

        return pc;
    }


    // ============================================
    // CREATE OFFER
    // ============================================

    async createOffer(targetUserId) {

        console.log("[WEBRTC-MESH]", {
            local: "current-browser",
            remote: targetUserId,
            action: "create-offer",
        });

        const pc = this.peerConnections[targetUserId];

        if (!pc) {
            console.error("PeerConnection not found:", targetUserId);
            return;
        }

        const offer = await pc.createOffer();

        console.log("OFFER SDP has audio:", offer.sdp.includes("m=audio"));

        await pc.setLocalDescription(offer);

        websocketService.send({
            type: "offer",
            target: targetUserId,
            offer
        });

    }


    // ============================================
    // CREATE ANSWER
    // ============================================

    async createAnswer(targetUserId, offer) {

        console.log("[WEBRTC-MESH]", {
            local: "current-browser",
            remote: targetUserId,
            action: "create-answer",
        });
        console.log("Incoming OFFER SDP has audio:", offer?.sdp?.includes("m=audio"));

        const pc = this.peerConnections[targetUserId];

        if (!pc) {
            console.error("PeerConnection not found:", targetUserId);
            return;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await this.flushPendingIceCandidates(targetUserId);

        const answer = await pc.createAnswer();

        console.log("ANSWER SDP has audio:", answer.sdp.includes("m=audio"));

        await pc.setLocalDescription(answer);

        websocketService.send({
            type: "answer",
            target: targetUserId,
            answer
        });

    }


    // ============================================
    // SET REMOTE ANSWER
    // ============================================

    async setRemoteAnswer(targetUserId, answer) {

        console.log("Remote Answer Received:", targetUserId);
        console.log("Incoming ANSWER SDP has audio:", answer?.sdp?.includes("m=audio"));

        const pc = this.peerConnections[targetUserId];

        if (!pc) {
            console.warn("Answer received for unknown peer:", targetUserId);
            return;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await this.flushPendingIceCandidates(targetUserId);

    }


    // ============================================
    // ADD ICE CANDIDATE
    // ============================================

    async addIceCandidate(targetUserId, candidate) {

        console.log("ICE Candidate Received From:", targetUserId);

        const pc = this.peerConnections[targetUserId];

        if (!pc || !pc.remoteDescription) {
            console.log("ICE candidate queued for:", targetUserId);
            this.pendingIceCandidates[targetUserId] ||= [];
            this.pendingIceCandidates[targetUserId].push(candidate);
            return;
        }

        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error("ICE Error:", error);
        }
    }

    async flushPendingIceCandidates(targetUserId) {

        const candidates = this.pendingIceCandidates[targetUserId] || [];

        if (!candidates.length) return;

        const pc = this.peerConnections[targetUserId];

        if (!pc || !pc.remoteDescription) return;

        delete this.pendingIceCandidates[targetUserId];

        for (const candidate of candidates) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.error("Queued ICE Error:", error);
            }
        }
    }


    // ============================================
    // CLOSE
    // ============================================

    closePeerConnection(targetUserId) {
        const pc = this.peerConnections[targetUserId];
        if (!pc) return;
        console.log("[WEBRTC-MESH]", {
            local: "current-browser",
            remote: targetUserId,
            action: "close",
        });
        pc.close();
        delete this.peerConnections[targetUserId];
        delete this.pendingIceCandidates[targetUserId];
    }

    closeAllConnections() {
        Object.keys(this.peerConnections).forEach(userId => {
            this.closePeerConnection(userId);
        });
    }

    closeConnection() {
        this.closeAllConnections();
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
    }

    getPeerConnection(targetUserId) {
        return this.peerConnections[targetUserId];
    }

    hasPeerConnection(targetUserId) {
        return !!this.peerConnections[targetUserId];
    }

    removePeerConnection(targetUserId) {
        if (this.peerConnections[targetUserId]) {
            this.peerConnections[targetUserId].close();
            delete this.peerConnections[targetUserId];
        }
        delete this.pendingIceCandidates[targetUserId];
    }

    getLocalStream() {
        return this.localStream;
    }

    toggleMicrophone(enabled) {
        if (!this.localStream) return;
     
        this.localStream.getAudioTracks().forEach(track => {
            track.enabled = enabled;
            console.log("Microphone:", enabled);
        });
    }

    toggleCamera(enabled) {
        if (!this.localStream) return;
        this.localStream.getVideoTracks().forEach(track => {
            track.enabled = enabled;
            console.log("Camera:", enabled);
        });
    }

    async replaceVideoTrack(newTrack) {
        const promises = [];
        Object.values(this.peerConnections).forEach(pc => {
            const sender = pc.getSenders().find(
                sender => sender.track && sender.track.kind === "video"
            );
            if (sender) {
                promises.push(sender.replaceTrack(newTrack));
            }
        });
        await Promise.all(promises);
    }

    async replaceAudioTrack(newTrack) {
        const promises = [];
        Object.values(this.peerConnections).forEach(pc => {
            const sender = pc.getSenders().find(
                sender => sender.track && sender.track.kind === "audio"
            );
            if (sender) {
                promises.push(sender.replaceTrack(newTrack));
            }
        });
        await Promise.all(promises);
    }

    async startScreenShare() {

        const stream = await getDisplayMediaSafely({
            video: true
        });

        const videoTrack = stream.getVideoTracks()[0];

        await this.replaceVideoTrack(videoTrack);

        videoTrack.onended = async () => {
            if (!this.localStream) return;
            const cameraTrack = this.localStream.getVideoTracks()[0];
            if (cameraTrack) {
                await this.replaceVideoTrack(cameraTrack);
            }
        };

        return stream;
    }

}

export default new WebRTCService();
