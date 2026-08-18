import { getUserMediaSafely } from "./mediaDeviceService";

class AudioService {

    constructor() {

        this.mediaRecorder = null;
        this.stream = null;
        this.isRecording = false;

        this.chunkIntervalMs = 5000;
        this.intervalId = null;
        this.onChunk = null;
        this.mimeType = "audio/webm";
        this.chunkCount = 0;
        this.muted = false;
        this.pendingStopResolve = null;

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
        this.muted = false;

        try {

            this.stream = await getUserMediaSafely({
                audio: true
            });

            const audioTrack = this.stream.getAudioTracks()[0];
            console.log("Microphone capture:", {
                enabled: audioTrack?.enabled,
                readyState: audioTrack?.readyState,
                settings: audioTrack?.getSettings(),
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

        if (!this.isRecording || this.muted || !this.stream) {
            return;
        }

        if (
            this.mediaRecorder &&
            this.mediaRecorder.state !== "inactive"
        ) {
            console.warn(
                "[MIC-DEBUG] recorder cycle skipped; recorder is still active",
                { state: this.mediaRecorder.state }
            );
            return;
        }

        const recorder = this.mimeType
            ? new MediaRecorder(this.stream, { mimeType: this.mimeType })
            : new MediaRecorder(this.stream);
        this.mediaRecorder = recorder;

        const recorderMimeType =
            recorder.mimeType || this.mimeType || "browser default";

        console.log("MediaRecorder started:", {
            mimeType: recorderMimeType,
            intervalMs: this.chunkIntervalMs,
        });

        const chunks = [];

        recorder.ondataavailable = (event) => {

            if (event.data && event.data.size > 0) {
                chunks.push(event.data);
            }

        };

        recorder.onerror = (event) => {

            console.error(
                "MediaRecorder Error:",
                event.error || event
            );

        };

        recorder.onstop = async () => {

            if (chunks.length > 0) {

                try {

                    const blob = new Blob(chunks, { type: recorderMimeType });
                    const arrayBuffer = await blob.arrayBuffer();

                    this.chunkCount += 1;

                    if (this.chunkCount === 1 || this.chunkCount % 5 === 0) {
                        console.log("Audio chunk captured:", {
                            number: this.chunkCount,
                            bytes: arrayBuffer.byteLength,
                            mimeType: recorderMimeType,
                        });
                    }

                    if (!this.muted && typeof this.onChunk === "function") {
                        this.onChunk(arrayBuffer);
                    } else if (this.muted) {
                        console.log("[MIC] muted recorder chunk discarded");
                    }

                } catch (error) {

                    console.error(
                        "Error processing audio chunk:",
                        error
                    );

                }

            } else {

                console.warn("MediaRecorder stopped without audio data.");

            }

            // A stopped recorder cannot be restarted. Clear this exact
            // recorder reference before deciding whether to create the next
            // cycle, while deliberately keeping the microphone stream alive.
            if (this.mediaRecorder === recorder) {
                this.mediaRecorder = null;
            }

            console.log("[MIC-DEBUG] recorder stopped", {
                recorderState: recorder.state,
                recording: this.isRecording,
                muted: this.muted,
                streamActive: this.stream?.active ?? false,
            });

            if (this.isRecording && !this.muted) {
                this._recordCycle();
            } else if (this.isRecording && this.muted) {
                console.log(
                    "[MIC-DEBUG] recorder paused for mute; microphone stream retained"
                );
            } else if (!this.isRecording) {
                this._releaseStream();
                this.pendingStopResolve?.();
                this.pendingStopResolve = null;
            }

        };

        recorder.start();

    }

    // ==========================================
    // STOP RECORDING
    // ==========================================

    _releaseStream() {
        if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
        }
        this.mediaRecorder = null;
        this.onChunk = null;
        this.chunkCount = 0;
    }

    setMuted(muted) {
        this.muted = Boolean(muted);
        const audioTracks = this.stream?.getAudioTracks() || [];
        console.log(`[MIC-DEBUG] ${this.muted ? "mute" : "unmute"}`, {
            audioTracks: audioTracks.length,
            recorderState: this.mediaRecorder?.state ?? "none",
            streamActive: this.stream?.active ?? false,
        });
        audioTracks.forEach((track, index) => {
            track.enabled = !this.muted;
            console.log("[MIC-DEBUG] recorder track", {
                index,
                readyState: track.readyState,
                enabled: track.enabled,
                muted: track.muted,
            });
        });

        if (
            this.muted &&
            this.mediaRecorder &&
            this.mediaRecorder.state !== "inactive"
        ) {
            this.mediaRecorder.stop();
            return;
        }

        if (!this.muted) {
            if (!this.stream?.active || audioTracks.some((track) => track.readyState !== "live")) {
                console.error(
                    "[MIC-DEBUG] cannot resume recorder: microphone stream is no longer live"
                );
                return;
            }

            // An inactive recorder is permanently stopped. It must not block
            // the next cycle from being created with the same live stream.
            if (this.mediaRecorder?.state === "inactive") {
                this.mediaRecorder = null;
            }

            if (this.isRecording && !this.mediaRecorder) {
                this._recordCycle();
            }
        }
    }

    stopRecording() {

        this.isRecording = false;

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        return new Promise((resolve) => {
            this.pendingStopResolve = resolve;
            if (this.mediaRecorder) {
                // `inactive` can mean that stop() has already been called
                // and its asynchronous onstop handler is still assembling
                // the final WebM blob. Do not release the stream/onChunk
                // callback here; onstop owns the final chunk and resolves
                // this promise after it is delivered.
                if (this.mediaRecorder.state !== "inactive") {
                    this.mediaRecorder.stop();
                }
            } else {
                this._releaseStream();
                this.pendingStopResolve?.();
                this.pendingStopResolve = null;
            }
        });

    }

    // ==========================================
    // RECORDING STATUS
    // ==========================================

    isActive() {

        return this.isRecording;

    }

}

export default new AudioService();
