class AudioService {

    constructor() {

        this.mediaRecorder = null;
        this.stream = null;
        this.isRecording = false;

        this.chunkIntervalMs = 5000;
        this.intervalId = null;
        this.onChunk = null;
        this.mimeType = "audio/webm";

    }

    // ==========================================
    // START RECORDING
    // ==========================================
    //
    // A single MediaRecorder running in timeslice mode only produces
    // one *complete*, independently-decodable file: the very first
    // chunk. Every chunk after that is a headerless continuation
    // fragment, so handing each one to ffmpeg/Whisper on the backend
    // as if it were a standalone file fails for every chunk past the
    // first. To keep every chunk self-contained, we instead start a
    // brand new MediaRecorder on the same stream every interval,
    // stop it (which flushes one full WebM file), and immediately
    // start the next one.

    async startRecording(onChunk) {

        if (this.isRecording) {
            console.log("Audio recording is already running.");
            return;
        }

        this.onChunk = onChunk;

        try {

            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: true
            });

            if (!MediaRecorder.isTypeSupported(this.mimeType)) {
                this.mimeType = "";
            }

            this.isRecording = true;

            this._recordCycle();

            this.intervalId = setInterval(() => {

                if (
                    this.mediaRecorder &&
                    this.mediaRecorder.state !== "inactive"
                ) {
                    this.mediaRecorder.stop();
                }

            }, this.chunkIntervalMs);

        } catch (error) {

            console.error(
                "Unable to access microphone:",
                error
            );

            this.isRecording = false;

        }

    }

    // Starts one short-lived MediaRecorder cycle. When it stops
    // (either from our interval timer or from stopRecording()),
    // it hands back exactly one complete WebM blob and, if we're
    // still supposed to be recording, immediately starts the next
    // cycle so capture stays continuous from the user's perspective.

    _recordCycle() {

        if (!this.isRecording || !this.stream) {
            return;
        }

        this.mediaRecorder = this.mimeType
            ? new MediaRecorder(this.stream, { mimeType: this.mimeType })
            : new MediaRecorder(this.stream);

        const chunks = [];

        this.mediaRecorder.ondataavailable = (event) => {

            if (event.data && event.data.size > 0) {
                chunks.push(event.data);
            }

        };

        this.mediaRecorder.onerror = (event) => {

            console.error(
                "MediaRecorder Error:",
                event.error || event
            );

        };

        this.mediaRecorder.onstop = async () => {

            if (chunks.length > 0) {

                try {

                    const blob = new Blob(chunks, { type: this.mimeType });
                    const arrayBuffer = await blob.arrayBuffer();

                    if (typeof this.onChunk === "function") {
                        this.onChunk(arrayBuffer);
                    }

                } catch (error) {

                    console.error(
                        "Error processing audio chunk:",
                        error
                    );

                }

            }

            if (this.isRecording) {
                this._recordCycle();
            }

        };

        this.mediaRecorder.start();

    }

    // ==========================================
    // STOP RECORDING
    // ==========================================

    stopRecording() {

        this.isRecording = false;

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

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
        this.onChunk = null;

    }

    // ==========================================
    // RECORDING STATUS
    // ==========================================

    isActive() {

        return this.isRecording;

    }

}

export default new AudioService();