import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
    getUsers,
    sendInvitation
} from "../services/invitationService";

import "./AddParticipants.css";

const AddParticipants = () => {

    const { meetingId } = useParams();
    const navigate = useNavigate();

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
                navigate(`/meeting/${meetingId}`);
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

    if (loading) {
        return <h2>Loading users...</h2>;
    }

    return (
        <div className="participants-page">

            <h2>Add Participants</h2>

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

        </div>
    );
};

export default AddParticipants;