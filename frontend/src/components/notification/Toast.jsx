import { useEffect, useState } from "react";
import "./Toast.css";

function Toast() {
    const [toast, setToast] = useState(null);

    useEffect(() => {
        let dismissTimer;
        const handleToast = ({ detail }) => {
            window.clearTimeout(dismissTimer);
            setToast(detail);
            dismissTimer = window.setTimeout(
                () => setToast(null),
                detail.type === "error" ? 6000 : 3500,
            );
        };

        window.addEventListener("linguasync-toast", handleToast);
        return () => {
            window.removeEventListener("linguasync-toast", handleToast);
            window.clearTimeout(dismissTimer);
        };
    }, []);

    if (!toast?.message) return null;

    return (
        <div className={`app-toast app-toast--${toast.type || "success"}`} role="status" aria-live="polite">
            <span>{toast.message}</span>
            <button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}>×</button>
        </div>
    );
}

export default Toast;
