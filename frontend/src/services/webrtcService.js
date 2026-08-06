import websocketService from "./websocketService";

class WebRTCService {

constructor() {

this.peerConnections = {};

this.localStream = null;

this.configuration = {
iceServers: [
{
urls: "stun:stun.l.google.com:19302",
}
],
};

}

async startLocalStream(video = true, audio = true) {

if (this.localStream) {
return this.localStream;
}

this.localStream =
await navigator.mediaDevices.getUserMedia({
video,
audio
});

return this.localStream;

}

async createPeerConnection(
targetUserId,
onRemoteStream
) {

if (this.peerConnections[targetUserId]) {
return this.peerConnections[targetUserId];
}

const pc =
new RTCPeerConnection(this.configuration);

this.peerConnections[targetUserId] = pc;

if (this.localStream) {

this.localStream
.getTracks()
.forEach(track => {

pc.addTrack(
track,
this.localStream
);

});

}

pc.ontrack = (event) => {

const remoteStream =
event.streams[0];

console.log(
"Remote Stream From:",
targetUserId
);

if (onRemoteStream) {

onRemoteStream(
targetUserId,
remoteStream
);

}

};

pc.onicecandidate = (event) => {

if (!event.candidate) return;

websocketService.send({

type: "ice_candidate",

target: targetUserId,

candidate: event.candidate

});

};

pc.onconnectionstatechange = () => {

console.log(
targetUserId,
pc.connectionState
);

if (
pc.connectionState === "failed" ||
pc.connectionState === "closed" ||
pc.connectionState === "disconnected"
) {

delete this.peerConnections[
targetUserId
];

}

};

return pc;

}
async createOffer(targetUserId) {
    console.log("createOffer() called for:", targetUserId);

const pc = this.peerConnections[targetUserId];

if (!pc) return;

const offer = await pc.createOffer();

await pc.setLocalDescription(offer);

websocketService.send({

type: "offer",

target: targetUserId,

offer

});

}

async createAnswer(targetUserId, offer) {
    console.log("createAnswer() called for:", targetUserId);

const pc = this.peerConnections[targetUserId];

if (!pc) return;

await pc.setRemoteDescription(
    
new RTCSessionDescription(offer)
);

const answer =
await pc.createAnswer();

await pc.setLocalDescription(answer);

websocketService.send({

type: "answer",

target: targetUserId,

answer

});

}

async setRemoteAnswer(
targetUserId,
answer
) {
    console.log("Remote Answer Received");

const pc =
this.peerConnections[targetUserId];

if (!pc) return;

await pc.setRemoteDescription(
new RTCSessionDescription(answer)
);

}

async addIceCandidate(
targetUserId,
candidate
) {
console.log("ICE Candidate Received From:", targetUserId);
const pc =
this.peerConnections[targetUserId];

if (!pc) return;

try {

await pc.addIceCandidate(
new RTCIceCandidate(candidate)
);

}
catch (err) {

console.error(
"ICE Error",
err
);

}

}
closePeerConnection(targetUserId) {

const pc = this.peerConnections[targetUserId];

if (!pc) return;

pc.close();

delete this.peerConnections[targetUserId];

}

closeAllConnections() {

Object.keys(this.peerConnections).forEach(userId => {

this.closePeerConnection(userId);

});

}

closeConnection() {

this.closeAllConnections();

if (this.localStream) {

this.localStream.getTracks().forEach(track => {

track.stop();

});

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

}
getLocalStream() {

    return this.localStream;

}

toggleMicrophone(enabled) {

    if (!this.localStream) return;

    this.localStream
        .getAudioTracks()
        .forEach(track => {

            track.enabled = enabled;

        });

}

toggleCamera(enabled) {

    if (!this.localStream) return;

    this.localStream
        .getVideoTracks()
        .forEach(track => {

            track.enabled = enabled;

        });

}

replaceVideoTrack(newTrack) {

    Object.values(this.peerConnections).forEach(pc => {

        const sender = pc.getSenders().find(
            sender =>
                sender.track &&
                sender.track.kind === "video"
        );

        if (sender) {

            sender.replaceTrack(newTrack);

        }

    });

}

replaceAudioTrack(newTrack) {

    Object.values(this.peerConnections).forEach(pc => {

        const sender = pc.getSenders().find(
            sender =>
                sender.track &&
                sender.track.kind === "audio"
        );

        if (sender) {
             sender.replaceTrack(newTrack);

        }

    });

}

async startScreenShare() {

    const stream =
        await navigator.mediaDevices.getDisplayMedia({

            video: true

        });

    const videoTrack =
        stream.getVideoTracks()[0];

     this.replaceVideoTrack(videoTrack);

    videoTrack.onended = () => {

        if (!this.localStream) return;

        const cameraTrack =
            this.localStream.getVideoTracks()[0];

         this.replaceVideoTrack(cameraTrack);

    };

    return stream;

}
}
export default new WebRTCService();