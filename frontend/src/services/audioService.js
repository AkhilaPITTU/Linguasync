import { getUserMediaSafely } from "./mediaDeviceService";

class AudioService {

    constructor() {

        this.mediaRecorder = null;
        this.stream = null;
        this.sourceStream = null;
        this.sourceStreamId = null;
        this.ownsStream = false;
        this.isRecording = false;

        this.chunkIntervalMs = 5000;
        this.intervalId = null;
        this.onChunk = null;
        this.mimeType = "audio/webm";
        this.chunkCount = 0;
        this.muted = false;
        this.recordingGeneration = 0;
        this.isStartingRecorder = false;
        this.pendingStopResolve = null;
        this.audioContext = null;
        this.analyser = null;
        this.audioLevelTimer = null;

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

    async startRecording(onChunk, existingStream = null) {

        if (this.isRecording) {
            console.log("Audio recording is already running.");
            return;
        }

        this.onChunk = onChunk;

        try {

            // MediaRecorder is configured for audio/webm, so it must receive
            // an audio-only stream. A video meeting's WebRTC stream contains
            // a camera track too; wrapping the same microphone track avoids
            // the audio-MIME/video-stream NotSupportedError without opening a
            // second microphone capture.
            this.ownsStream = !existingStream;
            this.sourceStream = existingStream || null;
            this.stream = this.sourceStream
                ? new MediaStream(this.sourceStream.getAudioTracks())
                : await getUserMediaSafely({ audio: true });
            this.sourceStreamId = existingStream?.id || this.stream.id;

            const audioTrack = this.stream.getAudioTracks()[0];
            if (!audioTrack || audioTrack.kind !== "audio" || audioTrack.readyState !== "live" || !this.stream.active) {
                throw new Error("A live microphone audio track is required before recording can start.");
            }
            // Do not re-enable a track that was muted before the recorder
            // started. The WebRTC local track owns microphone state.
            this.muted = !this.stream.getAudioTracks().some(
                (track) => track.readyState === "live" && track.enabled
            );
            console.log("[MIC-DEBUG] microphone track ready", {
                sourceStreamId: this.sourceStreamId,
                recorderStreamId: this.stream.id,
                trackId: audioTrack.id,
                kind: audioTrack.kind,
                enabled: audioTrack.enabled,
                muted: audioTrack.muted,
                readyState: audioTrack.readyState,
                active: this.stream.active,
                settings: audioTrack.getSettings(),
            });

            if (typeof MediaRecorder === "undefined") {
                throw new Error("MediaRecorder is unavailable in this browser.");
            }

            // Chromium normally records microphone WebM as Opus. Prefer the
            // exact format, with browser-safe fallbacks if necessary.
            this.mimeType = this._getSupportedMimeTypes()[0] || "";
            console.log("[MIC-DEBUG] MIME", {
                mimeType: this.mimeType || "browser default",
                supported: this.mimeType
                    ? MediaRecorder.isTypeSupported(this.mimeType)
                    : "browser default",
            });

            this.isRecording = true;

            this._startAudioLevelMonitor();

            if (!this._recordCycle()) {
                throw new Error("MediaRecorder could not start for the live microphone track.");
            }

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
            this._releaseStream();

        }

    }

    // Starts one short-lived MediaRecorder cycle. When it stops
    // (either from our interval timer or from stopRecording()),
    // it hands back exactly one complete WebM blob and, if we're
    // still supposed to be recording, immediately starts the next
    // cycle so capture stays continuous from the user's perspective.

    _recordCycle() {

        if (!this._ensureLiveRecorderStream()) {
            return false;
        }

        const liveAudioTracks = this.stream?.getAudioTracks().filter(
            (track) => track.readyState === "live"
        ) || [];

        if (
            !this.isRecording ||
            this.muted ||
            !this.stream?.active ||
            !liveAudioTracks.length ||
            this.isStartingRecorder
        ) {
            console.warn("[MIC-DEBUG] recorder cycle not started", {
                recording: this.isRecording,
                muted: this.muted,
                streamActive: this.stream?.active ?? false,
                audioTracks: liveAudioTracks.length,
                starting: this.isStartingRecorder,
            });
            return false;
        }

        console.log("[MIC-DEBUG] STREAM BEFORE RECORDER", {
            sourceStreamId: this.sourceStreamId,
            streamId: this.stream.id,
            active: this.stream.active,
            audioTracks: liveAudioTracks.length,
            tracks: liveAudioTracks.map((track) => ({
                id: track.id,
                kind: track.kind,
                enabled: track.enabled,
                muted: track.muted,
                readyState: track.readyState,
            })),
        });

        if (
            this.mediaRecorder &&
            this.mediaRecorder.state !== "inactive"
        ) {
            console.warn(
                "[MIC-DEBUG] recorder cycle skipped; recorder is still active",
                { state: this.mediaRecorder.state }
            );
            return false;
        }

        let recorder;
        this.isStartingRecorder = true;
        try {
            recorder = this.mimeType
                ? new MediaRecorder(this.stream, { mimeType: this.mimeType })
                : new MediaRecorder(this.stream);
        } catch (error) {
            console.error("[MIC-DEBUG] MediaRecorder construction failed", {
                name: error?.name,
                message: error?.message,
                stack: error?.stack,
                mimeType: this.mimeType || "browser default",
                streamActive: this.stream?.active ?? false,
                audioTracks: liveAudioTracks.map((track) => ({
                    id: track.id,
                    enabled: track.enabled,
                    readyState: track.readyState,
                })),
            });
            this.isStartingRecorder = false;
            return false;
        }
        const cycleGeneration = this.recordingGeneration;
        this.mediaRecorder = recorder;

        const recorderMimeType =
            recorder.mimeType || this.mimeType || "browser default";

        const chunks = [];

        recorder.onstart = () => {
            console.log("[MIC-DEBUG] MediaRecorder started", {
                mimeType: recorder.mimeType || recorderMimeType,
                recorderState: recorder.state,
                streamActive: this.stream?.active ?? false,
            });
        };

        recorder.ondataavailable = (event) => {

            if (event.data && event.data.size > 0) {
                console.log("[MIC-DEBUG] AUDIO CHUNK", {
                    size: event.data.size,
                    type: event.data.type,
                });
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

                    if (
                        !this.muted &&
                        cycleGeneration === this.recordingGeneration &&
                        typeof this.onChunk === "function"
                    ) {
                        this.onChunk(arrayBuffer);
                    } else {
                        console.log("[MIC] stale or muted recorder chunk discarded");
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

        try {
            if (recorder.state !== "inactive") {
                console.error("[MIC-DEBUG] INVALID RECORDER STATE BEFORE START", {
                    state: recorder.state,
                });
                this.mediaRecorder = null;
                return false;
            }
            console.log("[MIC-DEBUG] BEFORE START", {
                state: recorder.state,
                mimeType: recorder.mimeType,
            });
            recorder.start();
            return true;
        } catch (error) {
            console.error("[MIC-DEBUG] MediaRecorder start failed", {
                name: error?.name,
                message: error?.message,
                stack: error?.stack,
                recorderState: recorder.state,
                recorderMimeType: recorder.mimeType,
                mimeType: recorderMimeType,
                streamActive: this.stream?.active ?? false,
                audioTracks: liveAudioTracks.map((track) => ({
                    enabled: track.enabled,
                    readyState: track.readyState,
                })),
            });
            if (this.mediaRecorder === recorder) {
                this.mediaRecorder = null;
            }

            const fallbackMimeType = this._getSupportedMimeTypes()
                .find((candidate) => candidate !== this.mimeType);

            if (fallbackMimeType) {
                console.warn("[MIC-DEBUG] retrying MediaRecorder with fallback MIME", {
                    failedMimeType: this.mimeType,
                    fallbackMimeType,
                });
                this.mimeType = fallbackMimeType;
                this.isStartingRecorder = false;
                return this._recordCycle();
            }

            this.isRecording = false;
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            return false;
        } finally {
            this.isStartingRecorder = false;
        }

    }

    // ==========================================
    // STOP RECORDING
    // ==========================================

    _releaseStream() {
        this._stopAudioLevelMonitor();
        if (this.stream && this.ownsStream) {
            this.stream.getTracks().forEach((track) => track.stop());
        }
        this.stream = null;
        this.sourceStream = null;
        this.sourceStreamId = null;
        this.ownsStream = false;
        this.mediaRecorder = null;
        this.isStartingRecorder = false;
        this.onChunk = null;
        this.chunkCount = 0;
    }

    // The recorder receives an audio-only wrapper around the local WebRTC
    // stream. That wrapper must never be treated as the microphone owner:
    // if a browser marks it inactive while the original local track is still
    // live, recreate the wrapper from that same track instead of asking for
    // microphone permission again.
    _ensureLiveRecorderStream() {
        const recorderTracks = this.stream?.getAudioTracks().filter(
            (track) => track.readyState === "live"
        ) || [];

        if (this.stream?.active && recorderTracks.length) {
            return true;
        }

        const sourceTracks = this.sourceStream?.getAudioTracks().filter(
            (track) => track.readyState === "live"
        ) || [];

        if (!sourceTracks.length) {
            console.error("[MIC-DEBUG] cannot resume recorder: microphone source is no longer live", {
                recorderStreamActive: this.stream?.active ?? false,
                sourceStreamActive: this.sourceStream?.active ?? false,
                recorderTracks: recorderTracks.map((track) => ({
                    enabled: track.enabled,
                    muted: track.muted,
                    readyState: track.readyState,
                })),
            });
            return false;
        }

        this.stream = new MediaStream(sourceTracks);
        this._startAudioLevelMonitor();

        console.warn("[MIC-DEBUG] recorder stream restored from live local microphone track", {
            sourceStreamId: this.sourceStream.id,
            recorderStreamId: this.stream.id,
            audioTracks: sourceTracks.map((track) => ({
                id: track.id,
                enabled: track.enabled,
                muted: track.muted,
                readyState: track.readyState,
            })),
        });

        return true;
    }

    _getSupportedMimeTypes() {
        const candidates = [
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/ogg;codecs=opus",
        ];

        return candidates.filter((mimeType) => (
            typeof MediaRecorder !== "undefined" &&
            MediaRecorder.isTypeSupported(mimeType)
        ));
    }

    _startAudioLevelMonitor() {
        this._stopAudioLevelMonitor();

        try {
            const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextConstructor) return;

            this.audioContext = new AudioContextConstructor();
            const source = this.audioContext.createMediaStreamSource(this.stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            source.connect(this.analyser);
            this.audioContext.resume().catch(() => {});

            const samples = new Uint8Array(this.analyser.fftSize);
            this.audioLevelTimer = setInterval(() => {
                if (!this.analyser) return;

                this.analyser.getByteTimeDomainData(samples);
                const sumSquares = samples.reduce((sum, sample) => {
                    const normalized = (sample - 128) / 128;
                    return sum + (normalized * normalized);
                }, 0);
                const rms = Math.sqrt(sumSquares / samples.length);
                console.log("[MIC-LEVEL]", { rms: Number(rms.toFixed(5)) });
            }, 2000);
        } catch (error) {
            console.warn("[MIC-DEBUG] microphone level monitor unavailable", {
                name: error?.name,
                message: error?.message,
            });
        }
    }

    _stopAudioLevelMonitor() {
        if (this.audioLevelTimer) {
            clearInterval(this.audioLevelTimer);
            this.audioLevelTimer = null;
        }
        this.analyser = null;
        if (this.audioContext) {
            this.audioContext.close().catch(() => {});
            this.audioContext = null;
        }
    }

    setMuted(muted) {
        this.muted = Boolean(muted);
        if (this.muted) {
            // Invalidate a recorder cycle before its asynchronous `onstop`
            // handler can deliver pre-mute audio after a quick unmute.
            this.recordingGeneration += 1;
        }
        const audioTracks = this.stream?.getAudioTracks() || [];
        console.log(`[MIC-DEBUG] ${this.muted ? "mute" : "unmute"}`, {
            audioTracks: audioTracks.length,
            recorderState: this.mediaRecorder?.state ?? "none",
            streamActive: this.stream?.active ?? false,
            tracks: audioTracks.map((track) => ({
                enabled: track.enabled,
                readyState: track.readyState,
            })),
        });

        if (!this.muted) {
            if (!this._ensureLiveRecorderStream()) {
                return;
            }

            // A recorder begun before mute can contain pre-mute audio. Flush
            // and discard it; its onstop handler starts a new cycle using this
            // same live stream after the generation check.
            if (this.mediaRecorder?.state === "recording") {
                this.mediaRecorder.stop();
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

    stopRecording(reason = "unspecified") {

        console.log("[MIC-DEBUG] stop recording", {
            reason,
            recorderState: this.mediaRecorder?.state ?? "none",
            streamActive: this.stream?.active ?? false,
            audioTracks: this.stream?.getAudioTracks().map((track) => ({
                enabled: track.enabled,
                readyState: track.readyState,
            })) ?? [],
        });

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
