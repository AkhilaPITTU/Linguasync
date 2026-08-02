import websocketService from "./websocketService";

class WebRTCService {

    constructor() {

        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;

        this.configuration = {
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302",
                },
            ],
        };

    }

    async startLocalStream() {

        if (this.localStream) {
            return this.localStream;
        }

        this.localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });

        return this.localStream;
    }

    async createPeerConnection(targetUserId, onRemoteStream) {

        if (
    this.peerConnection &&
    this.peerConnection.connectionState !== "closed"
) {
    return this.peerConnection;
}

this.peerConnection = new RTCPeerConnection(this.configuration);

        if (this.localStream) {

            this.localStream.getTracks().forEach((track) => {
                this.peerConnection.addTrack(track, this.localStream);
            });

        }

        this.peerConnection.ontrack = (event) => {

            this.remoteStream = event.streams[0];

            if (onRemoteStream) {
                onRemoteStream(this.remoteStream);
            }

        };

        this.peerConnection.onicecandidate = (event) => {

            if (event.candidate) {

                websocketService.send({
                    type: "ice_candidate",
                    target: targetUserId,
                    candidate: event.candidate,
                });

            }

        };

        return this.peerConnection;
    }

    async createOffer(targetUserId) {

        const offer = await this.peerConnection.createOffer();

        await this.peerConnection.setLocalDescription(offer);

        websocketService.send({
            type: "offer",
            target: targetUserId,
            offer,
        });

    }

    async createAnswer(targetUserId, offer) {

        await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(offer)
        );

        const answer = await this.peerConnection.createAnswer();

        await this.peerConnection.setLocalDescription(answer);

        websocketService.send({
            type: "answer",
            target: targetUserId,
            answer,
        });

    }

    async setRemoteAnswer(answer) {

        await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(answer)
        );

    }

    async addIceCandidate(candidate) {

        if (this.peerConnection) {

            await this.peerConnection.addIceCandidate(
                new RTCIceCandidate(candidate)
            );

        }

    }

    closeConnection() {

        if (this.peerConnection) {

            this.peerConnection.close();
            this.peerConnection = null;

        }

        if (this.localStream) {

            this.localStream.getTracks().forEach((track) => track.stop());

            this.localStream = null;

        }

        this.remoteStream = null;

    }

}

export default new WebRTCService();