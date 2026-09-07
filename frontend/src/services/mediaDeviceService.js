const MEDIA_UNAVAILABLE_MESSAGE =
    "Camera and microphone are unavailable. Please use HTTPS or localhost and allow browser permissions.";

const assertMediaDevicesAvailable = () => {
    if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
        throw new Error(MEDIA_UNAVAILABLE_MESSAGE);
    }
};

export const getUserMediaSafely = async (constraints) => {
    assertMediaDevicesAvailable();

    try {
        return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
        if (error?.name === "NotAllowedError") {
            throw new Error(
                "Camera and microphone permission was denied. Please allow access and try again.",
                { cause: error }
            );
        }
        throw error;
    }
};

export const getDisplayMediaSafely = async (constraints) => {
    if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getDisplayMedia !== "function"
    ) {
        throw new Error("Screen sharing is unavailable. Please use HTTPS or localhost.");
    }

    return navigator.mediaDevices.getDisplayMedia(constraints);
};

export { MEDIA_UNAVAILABLE_MESSAGE };
