const configuredApiUrl = import.meta.env.VITE_API_URL;
const useViteProxy = import.meta.env.VITE_USE_VITE_PROXY === "true";

const browserApiUrl =
    typeof window === "undefined"
        ? "http://127.0.0.1:8000"
        : `${window.location.protocol}//${window.location.hostname}:8000`;

export const API_BASE_URL = (
    configuredApiUrl || (useViteProxy && typeof window !== "undefined"
        ? window.location.origin
        : browserApiUrl)
).replace(/\/$/, "");

export const WEBSOCKET_BASE_URL = (
    import.meta.env.VITE_WS_URL ||
    API_BASE_URL.replace(/^http/, "ws")
).replace(/\/$/, "");
