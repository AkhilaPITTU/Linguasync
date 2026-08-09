import { useEffect, useState } from "react";

import {
    getUsers,
    sendInvitation
} from "../services/invitationService";

import "./AddParticipants.css";

// This component is now rendered as an in-call modal from
// MeetingRoom instead of being mounted at its own route. It used
// to read meetingId from useParams() and call navigate() to close
// itself -- both of those caused MeetingRoom to unmount, which
// stopped the local camera/mic tracks and tore down the
// websocket + all peer connections. Now it takes meetingId and
// onClose as props, and MeetingRoom stays mounted the whole time.

const AddParticipants = ({ meetingId, onClose }) => {

    const [users, setUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const response = await getUsers();

            if (response.success) {
                setUsers(response.users);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to load users.");
        } finally {
            setLoading(false);
        }
    };

    const toggleUser = (userId) => {
        if (selectedUsers.includes(userId)) {
            setSelectedUsers(selectedUsers.filter(id => id !== userId));
        } else {
            setSelectedUsers([...selectedUsers, userId]);
        }
    };

    const inviteUsers = async () => {

        if (selectedUsers.length === 0) {
            alert("Please select at least one participant.");
            return;
        }

        try {

            setSending(true);

            const response = await sendInvitation(
                meetingId,
                selectedUsers
            );

            if (response.success) {
                alert("Invitations sent successfully.");
                onClose();
            } else {
                alert(response.message || "Failed to send invitations.");
            }

        } catch (error) {

            console.error(error);

            alert(
                error?.message ||
                "Failed to send invitations."
            );

        } finally {

            setSending(false);

        }
    };

    const filteredUsers = users.filter(user =>
        user.full_name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="participants-modal-overlay" onClick={onClose}>

            <div
                className="participants-page"
                onClick={(e) => e.stopPropagation()}
            >

                <div className="participants-modal-header">
                    <h2>Add Participants</h2>
                    <button
                        className="participants-modal-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {loading ? (

                    <h2>Loading users...</h2>

                ) : (

                    <>

                        <input
                            type="text"
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        <div className="participants-list">

                            {filteredUsers.length === 0 ? (
                                <p>No users found.</p>
                            ) : (
                                filteredUsers.map(user => (
                                    <div
                                        key={user.user_id}
                                        className="participant-card"
                                    >

                                        <div>
                                            <h4>{user.full_name}</h4>
                                            <p>{user.email}</p>
                                        </div>

                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user.user_id)}
                                            onChange={() => toggleUser(user.user_id)}
                                        />

                                    </div>
                                ))
                            )}

                        </div>

                        <button
                            className="invite-btn"
                            onClick={inviteUsers}
                            disabled={sending}
                        >
                            {sending ? "Sending..." : "Send Invitations"}
                        </button>

                    </>

                )}

            </div>

        </div>
    );
};

export default AddParticipants;
