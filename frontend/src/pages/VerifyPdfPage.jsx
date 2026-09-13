import "./Dashboard.css";
import "./VerifyPdfPage.css";

import { useRef, useState } from "react";

import Sidebar from "../components/dashboard/Sidebar";
import Header from "../components/dashboard/Header";
import { verifyConversationPdf } from "../services/conversationExportService";
import { showToast } from "../components/notification/toastService";
import { formatISTDateTime } from "../utils/formatIST";

import {
    FiUploadCloud,
    FiCheckCircle,
    FiXCircle,
    FiShieldOff,
} from "react-icons/fi";

function resultTone(result) {
    if (!result) return "neutral";
    if (result.signature_valid) return "valid";
    if (result.signed === false) return "unsigned";
    return "invalid";
}

function VerifyPdfPage() {

    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [verifying, setVerifying] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    const handleFileChange = (event) => {
        const file = event.target.files?.[0] || null;
        setSelectedFile(file);
        setResult(null);
        setError("");
    };

    const handleVerify = async () => {
        if (!selectedFile) {
            showToast("Choose a PDF file first.", "error");
            return;
        }

        setVerifying(true);
        setError("");
        setResult(null);

        try {
            const data = await verifyConversationPdf(selectedFile);
            setResult(data);
        } catch (verifyError) {
            console.error("PDF verification error:", verifyError);
            const message =
                verifyError?.response?.data?.detail ||
                verifyError?.message ||
                "Unable to verify this PDF right now.";
            setError(message);
            showToast(message, "error");
        } finally {
            setVerifying(false);
        }
    };

    const tone = resultTone(result);

    return (
        <div className="dashboard">
            <Sidebar />
            <div className="dashboard-right">
                <Header />
                <main className="dashboard-content">
                    <div className="dashboard-card verify-pdf-card">
                        <div className="card-header">
                            <h2>Verify Conversation PDF</h2>
                        </div>

                        <p className="verify-pdf-intro">
                            Upload a conversation PDF exported from LinguaSync to confirm it
                            is authentic and has not been edited since it was generated.
                        </p>

                        <label className="verify-pdf-dropzone" htmlFor="verify-pdf-input">
                            <FiUploadCloud size={28} />
                            <span>
                                {selectedFile ? selectedFile.name : "Click to choose a PDF file"}
                            </span>
                            <input
                                id="verify-pdf-input"
                                ref={fileInputRef}
                                type="file"
                                accept="application/pdf,.pdf"
                                onChange={handleFileChange}
                                hidden
                            />
                        </label>

                        <button
                            type="button"
                            className="verify-pdf-btn"
                            onClick={handleVerify}
                            disabled={verifying || !selectedFile}
                        >
                            {verifying ? "Verifying…" : "Verify Signature"}
                        </button>

                        {error && <p className="dashboard-state error">{error}</p>}

                        {result && (
                            <div className={`verify-result verify-result--${tone}`}>
                                <div className="verify-result-heading">
                                    {tone === "valid" && <FiCheckCircle />}
                                    {tone === "invalid" && <FiXCircle />}
                                    {tone === "unsigned" && <FiShieldOff />}
                                    <div>
                                        <h3>
                                            {tone === "valid" && "Signature Valid — Document Authentic"}
                                            {tone === "invalid" &&
                                                (result.document_modified
                                                    ? "Signature Invalid — Document Modified"
                                                    : "Signature Invalid")}
                                            {tone === "unsigned" && "No LinguaSync Signature Found"}
                                        </h3>
                                        {result.message && <p>{result.message}</p>}
                                    </div>
                                </div>

                                <dl className="verify-result-details">
                                    {result.document_id && (
                                        <>
                                            <dt>Document ID</dt>
                                            <dd>{result.document_id}</dd>
                                        </>
                                    )}
                                    {result.meeting_id && (
                                        <>
                                            <dt>Meeting ID</dt>
                                            <dd>{result.meeting_id}</dd>
                                        </>
                                    )}
                                    {result.language && (
                                        <>
                                            <dt>Language</dt>
                                            <dd>{result.language}</dd>
                                        </>
                                    )}
                                    {result.generated_at && (
                                        <>
                                            <dt>Generated At</dt>
                                            <dd>{formatISTDateTime(result.generated_at)}</dd>
                                        </>
                                    )}
                                    {result.signer && (
                                        <>
                                            <dt>Signed By</dt>
                                            <dd>{result.signer}</dd>
                                        </>
                                    )}
                                    {result.signature_algorithm && (
                                        <>
                                            <dt>Signature Algorithm</dt>
                                            <dd>{result.signature_algorithm}</dd>
                                        </>
                                    )}
                                </dl>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default VerifyPdfPage;
