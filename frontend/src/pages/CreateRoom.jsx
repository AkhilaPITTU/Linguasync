import { useNavigate } from "react-router-dom";
import { createMeeting } from "../services/meetingService";

function CreateRoom() {
    const navigate = useNavigate();

    const handleCreate = async () => {
        try {
            const meeting = await createMeeting();

            navigate(`/meeting/${meeting.meeting_id}`);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div>
            <h1>Create Meeting</h1>

            <button onClick={handleCreate}>
                Create Meeting
            </button>
        </div>
    );
}

export default CreateRoom;