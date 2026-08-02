import "./VideoGrid.css";
import VideoTile from "./VideoTile";

const VideoGrid = ({ participants = [] }) => {

    return (

        <div className="video-grid">

            {participants.length === 0 ? (

                <div className="waiting-message">
                    Waiting for participants...
                </div>

            ) : (

                participants.map((participant) => (

                    <VideoTile
                        key={participant.id}
                        participant={participant}
                    />

                ))

            )}

        </div>

    );

};

export default VideoGrid;