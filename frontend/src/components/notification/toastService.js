export const showToast = (message, type = "success") => {
    window.dispatchEvent(new CustomEvent("linguasync-toast", {
        detail: { message, type },
    }));
};
