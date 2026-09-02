import "./ExportPanel.css";

const ExportPanel = ({
    transcript = [],
    translations = [],
    chatMessages = [],
}) => {

    const downloadJSON = (filename, data) => {

        const blob = new Blob(
            [JSON.stringify(data, null, 2)],
            {
                type: "application/json",
            }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;
        link.download = filename;

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        URL.revokeObjectURL(url);

    };

    const exportTranscript = () => {

        downloadJSON(
            "meeting_transcript.json",
            {
                transcript,
                translations,
                exportedAt: new Date().toISOString(),
            }
        );

    };

    const exportChat = () => {

        downloadJSON(
            "meeting_chat.json",
            {
                chatMessages,
                exportedAt: new Date().toISOString(),
            }
        );
    };

    const exportMeetingLog = () => {

        downloadJSON(
            "meeting_log.json",
            {
                transcript,
                translations,
                chatMessages,
                exportedAt: new Date().toISOString(),
            }
        );

    };

    return (

        <div className="export-panel">

            <h3>Export Meeting Data</h3>

            <p className="export-description">
                Download meeting information for future reference.
            </p>

            <div className="export-options">

                <div className="export-card">

                    <h4>Transcript</h4>

                    <p>Download translated meeting transcript.</p>

                    <button onClick={exportTranscript}>
                        Export Transcript
                    </button>

                </div>

                <div className="export-card">

                    <h4>Chat History</h4>

                    <p>Download all meeting chat messages.</p>

                    <button onClick={exportChat}>
                        Export Chat
                    </button>

                </div>

                <div className="export-card">

                    <h4>Meeting Log</h4>

                    <p>
                        Export transcript, translations and chat history.
                    </p>

                    <button onClick={exportMeetingLog}>
                        Export Complete Log
                    </button>

                </div>

            </div>

        </div>

    );

};

export default ExportPanel;
