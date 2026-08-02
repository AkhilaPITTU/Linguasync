import "./ExportedChats.css";

import { useEffect, useState } from "react";

import { getExportedChats } from "../../services/exportedChatsService";

import {
    FiFileText,
    FiDownload,
    FiFile,
    FiCalendar
} from "react-icons/fi";

function ExportedChats() {

    const [files, setFiles] = useState([]);

    useEffect(() => {

        async function fetchFiles() {

            try {

                const data = await getExportedChats();

                setFiles(data);

            }

            catch (error) {

                console.error("Exported Chats Error:", error);

            }

        }

        fetchFiles();

    }, []);

    return (

        <div className="dashboard-card exported-chats">

            <div className="card-header">

                <h2>

                    Exported Chats

                </h2>

                <span>

                    View All

                </span>

            </div>

            {

                files.map((file) => (

                    <div
                        key={file.id}
                        className="export-card"
                    >

                        <div className="export-left">

                            <div className="file-icon">

                                <FiFileText />

                            </div>

                            <div>

                                <h3>

                                    {file.filename}

                                </h3>

                                <p>

                                    <FiFile />

                                    {file.format}

                                    {" • "}

                                    {file.size}

                                </p>

                                <small>

                                    <FiCalendar />

                                    {file.created_at}

                                </small>

                            </div>

                        </div>

                        <button>

                            <FiDownload />

                        </button>

                    </div>

                ))

            }

        </div>

    );

}

export default ExportedChats;