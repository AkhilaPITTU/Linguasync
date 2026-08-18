import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    acceptInvitation,
    getPendingInvitations,
    rejectInvitation,
} from "../../services/invitationService";
import "./IncomingInvitationPopup.css";

const LANGUAGES = ["English", "Telugu", "Hindi", "Tamil", "Kannada", "Malayalam", "Bengali", "Marathi", "Gujarati", "Punjabi"];

function IncomingInvitationPopup() {
    const [invitation, setInvitation] = useState(null);
    const [language, setLanguage] = useState("English");
    const [outputMode, setOutputMode] = useState("subtitle");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const knownIds = useRef(new Set());
    const navigate = useNavigate();

    useEffect(() => {
        let active = true;
        const loadInvitation = async () => {
            try {
                const response = await getPendingInvitations();
                const next = response?.success && Array.isArray(response.data)
                    ? response.data.find((item) => !knownIds.current.has(item.invitation_id)) || response.data[0]
                    : null;
                if (active && next) setInvitation(next);
            } catch (loadError) {
                console.warn("Unable to check incoming invitations:", loadError);
            }
        };
        loadInvitation();
        const timer = window.setInterval(loadInvitation, 3000);
        return () => { active = false; window.clearInterval(timer); };
    }, []);

    const decline = async () => {
        if (!invitation) return;
        setBusy(true); setError("");
        try {
            await rejectInvitation(invitation.invitation_id);
            knownIds.current.add(invitation.invitation_id);
            setInvitation(null);
        } catch (requestError) {
            setError(requestError?.message || "Unable to decline this invitation.");
        } finally { setBusy(false); }
    };

    const accept = async () => {
        if (!invitation) return;
        setBusy(true); setError("");
        try {
            const response = await acceptInvitation(invitation.invitation_id, {
                preferred_language: language,
                output_mode: outputMode,
            });
            if (!response?.success) throw new Error(response?.message || "Unable to accept this invitation.");
            knownIds.current.add(invitation.invitation_id);
            const meetingId = invitation.meeting_id;
            setInvitation(null);
            navigate(`/meeting/${meetingId}`, { state: { joinPreferences: { preferred_language: language, output_mode: outputMode } } });
        } catch (requestError) {
            setError(requestError?.message || "Unable to accept this invitation.");
        } finally { setBusy(false); }
    };

    if (!invitation) return null;
    return (
        <div className="incoming-invitation-backdrop" role="presentation">
            <section className="incoming-invitation-popup" role="dialog" aria-modal="true" aria-labelledby="incoming-invitation-title">
                <p className="incoming-invitation-kicker">Incoming meeting invitation</p>
                <h2 id="incoming-invitation-title">{invitation.host_name || "A participant"} invited you</h2>
                <p>Join meeting {invitation.meeting_title || invitation.meeting_id} with your preferred output settings.</p>
                <label>Preferred language<select value={language} onChange={(event) => setLanguage(event.target.value)} disabled={busy}>{LANGUAGES.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Translation output<select value={outputMode} onChange={(event) => setOutputMode(event.target.value)} disabled={busy}><option value="none">No translation</option><option value="subtitle">Translated subtitles</option></select></label>
                {error && <p className="incoming-invitation-error">{error}</p>}
                <div className="incoming-invitation-actions"><button type="button" onClick={accept} disabled={busy}>{busy ? "Joining..." : "Accept & Join"}</button><button type="button" onClick={decline} disabled={busy}>Decline</button></div>
            </section>
        </div>
    );
}

export default IncomingInvitationPopup;
