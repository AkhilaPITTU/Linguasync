import "./ActiveCommunication.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getActiveMeeting } from "../../services/meetingService";
import { getPendingInvitations, acceptInvitation, rejectInvitation } from "../../services/invitationService";
import { FiPhone, FiVideo, FiMic, FiUsers, FiClock, FiGlobe, FiVolume2, FiPhoneCall, FiX } from "react-icons/fi";

function ActiveCommunication() {
const [activeCall, setActiveCall] = useState(null);
const [incomingCall, setIncomingCall] = useState(null);
const [loading, setLoading] = useState(true);
const navigate = useNavigate();

useEffect(() => {
const fetchData = async () => {
try {
const meetingRes = await getActiveMeeting();
if (meetingRes.success && meetingRes.meeting) {
setActiveCall(meetingRes.meeting);
setIncomingCall(null);
} else {
setActiveCall(null);
const inviteRes = await getPendingInvitations();
if (inviteRes.success && inviteRes.data.length > 0) {
setIncomingCall(inviteRes.data[0]);
} else {
setIncomingCall(null);
}
}
} catch (err) {
console.error(err);
setActiveCall(null);
setIncomingCall(null);
} finally {
setLoading(false);
}
};
fetchData();
const interval = setInterval(fetchData, 3000);
return () => clearInterval(interval);
}, []);

const openMeeting = () => {
if (!activeCall) return;
navigate(`/meeting/${activeCall.meeting_id}`);
};

const joinInvitation = async () => {
const res = await acceptInvitation(incomingCall.invitation_id);
navigate(`/meeting/${res.meeting_id}`);
};

const declineInvitation = async () => {
await rejectInvitation(incomingCall.invitation_id);
setIncomingCall(null);
};

if (loading) {
return (
<div className="active-card">
<h3>Loading...</h3>
</div>
);
}
if (!activeCall && incomingCall) {
return (
<div className="active-card">
<div className="active-header">
<span className="live-status">📞 INCOMING CALL</span>
</div>
<div className="participant">
<img src="/images/user.png" alt="Host"/>
<div>
<h3>{incomingCall.host_name}</h3>
<p>{incomingCall.meeting_type === "video" ? "📹 Video Meeting" : "🎙 Audio Meeting"}</p>
<p>{incomingCall.preferred_language}</p>
</div>
</div>
<div className="control-buttons">
<button className="join-button" onClick={joinInvitation}>
<FiPhoneCall/>
Join
</button>
<button className="leave-btn" onClick={declineInvitation}>
<FiX/>
Decline
</button>
</div>
</div>
);
}

if (!activeCall) {
return (
<div className="active-card">
<div className="active-header">
<span className="live-status">● OFFLINE</span>
</div>
<div className="participant">
<img src="/images/user.png" alt="User"/>
<div>
<h3>No Active Meeting</h3>
<p>Create or Join a Meeting</p>
</div>
</div>
</div>
);
}

const outputMode = {
original: "Original Voice",
text: "Translated Text",
speech: "Translated Speech",
translated_speech: "Translated Speech",
text_speech: "Text + Speech"
};
return (
<div className="active-card">
<div className="active-header">
<span className="live-status">● ACTIVE</span>
<div className="call-time">
<FiClock/>
{activeCall.duration}
</div>
</div>
<div className="participant">
<img src="/images/user.png" alt="User"/>
<div>
<h3>{activeCall.host_name || "Meeting Host"}</h3>
<p>Host ID : {activeCall.host_id}</p>
</div>
</div>
<div className="communication-info">
<div>
<span>Mode</span>
<strong>{activeCall.meeting_type === "video" ? "📹 Video" : "🎙 Audio"}</strong>
</div>
<div>
<span>Participants</span>
<strong><FiUsers/> {activeCall.participants}</strong>
</div>
<div>
<span>Language</span>
<strong>{activeCall.source_language} → {activeCall.preferred_language}</strong>
</div>
<div>
<span>Output</span>
<strong><FiVolume2/> {outputMode[activeCall.output_mode] || activeCall.output_mode}</strong>
</div>
<div>
<span>Translation</span>
<strong className="running"><FiGlobe/> {activeCall.translation_status}</strong>
</div>
<div>
<span>Microphone</span>
<strong><FiMic/> {activeCall.microphone_status}</strong>
</div>
<div>
<span>Camera</span>
<strong><FiVideo/> {activeCall.camera_status}</strong>
</div>
<div>
<span>Status</span>
<strong>{activeCall.status}</strong>
</div>
</div>
<div className="control-buttons">
<button>
<FiMic/>
</button>
<button>
<FiVideo/>
</button>
</div>
<button className="join-button" onClick={openMeeting}>
<FiPhone/>
Open Call
</button>
</div>
);
}
export default ActiveCommunication;