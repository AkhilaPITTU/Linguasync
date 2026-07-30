class AudioService {

    constructor() {

        this.mediaRecorder = null;
        this.stream = null;
        this.isRecording = false;

    }

    // ==========================================
    // START RECORDING
    // ==========================================

    async startRecording(onChunk) {

        if (this.isRecording) {
            console.log("Audio recording is already running.");
            return;
        }

        try {

            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: true
            });

            // Use a supported MIME type
            let mimeType = "audio/webm";

            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = "";
            }

            this.mediaRecorder = mimeType
                ? new MediaRecorder(this.stream, { mimeType })
                : new MediaRecorder(this.stream);

            this.mediaRecorder.onstart = () => {

                console.log("🎤 Recording Started");

                this.isRecording = true;

            };

            this.mediaRecorder.ondataavailable = async (event) => {

                if (!this.isRecording) {
                    return;
                }

                if (!event.data || event.data.size === 0) {
                    return;
                }

                try {

                    const arrayBuffer =
                        await event.data.arrayBuffer();

                    if (typeof onChunk === "function") {
                        onChunk(arrayBuffer);
                    }

                } catch (error) {

                    console.error(
                        "Error processing audio chunk:",
                        error
                    );

                }

            };

            this.mediaRecorder.onerror = (event) => {

                console.error(
                    "MediaRecorder Error:",
                    event.error || event
                );

            };

            this.mediaRecorder.onstop = () => {

                console.log("🛑 Recording Stopped");

                this.isRecording = false;

            };

            // Generate one chunk every second
            this.mediaRecorder.start(5000);

        } catch (error) {

            console.error(
                "Unable to access microphone:",
                error
            );

            this.isRecording = false;

        }

    }

    // ==========================================
    // STOP RECORDING
    // ==========================================

    stopRecording() {

        this.isRecording = false;

        if (
            this.mediaRecorder &&
            this.mediaRecorder.state !== "inactive"
        ) {

            this.mediaRecorder.stop();

        }

        if (this.stream) {

            this.stream.getTracks().forEach(track => {

                track.stop();

            });

            this.stream = null;

        }

        this.mediaRecorder = null;

    }

    // ==========================================
    // RECORDING STATUS
    // ==========================================

    isActive() {

        return this.isRecording;

    }

}

export default new AudioService();