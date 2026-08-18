import { WEBSOCKET_BASE_URL } from "./apiConfig";

class WebSocketService {

    constructor() {
        this.socket = null;
        this.socketInstanceId = 0;
        this.flushResolver = null;
    }

    connect(meetingId, userId, onMessage) {

        return new Promise((resolve, reject) => {

            if (this.socket) {
                console.log("[WS-DISCONNECT]", {
                    socketInstanceId: this.socket.__linguaSyncSocketInstanceId,
                    reason: "replaced_by_new_connection",
                });
                this.socket.close();
            }

            const wsUrl =
                `${WEBSOCKET_BASE_URL}/ws/meeting/${meetingId}/${userId}` +
                `?token=${encodeURIComponent(localStorage.getItem("access_token") || "")}`;

            console.log("WebSocket connecting:", wsUrl);

            const socket = new WebSocket(wsUrl);
            const socketInstanceId = ++this.socketInstanceId;
            socket.__linguaSyncSocketInstanceId = socketInstanceId;
            this.socket = socket;

            socket.onopen = () => {

                console.log("✅ WebSocket Connected");
                
                resolve();

            };

            socket.onmessage = (event) => {

                const data = JSON.parse(event.data);

                if (data.type === "conversation_flush_complete" && this.flushResolver) {
                    this.flushResolver(data);
                    this.flushResolver = null;
                }

                console.log("📨 WS:", data.type, data);

                if (onMessage) {
                    onMessage(data);
                }

            };

            socket.onerror = (error) => {

                console.error(error);

                reject(error);

            };

            socket.onclose = (event) => {

                const isCurrentSocket = this.socket === socket;
                console.log("[WS-DISCONNECT]", {
                    socketInstanceId,
                    code: event.code,
                    reason: event.reason,
                    isCurrentSocket,
                });

                // A reconnect closes the old socket. Its late close event
                // must not clear the newer connection's reference.
                if (isCurrentSocket) {
                    this.socket = null;
                }
                if (this.flushResolver) {
                    this.flushResolver({ flushed: false, reason: "socket_closed" });
                    this.flushResolver = null;
                }

            };

        });

    }

    send(data) {

        if (
            this.socket &&
            this.socket.readyState === WebSocket.OPEN
        ) {

            this.socket.send(JSON.stringify(data));
            return true;

        }

        return false;

    }

    disconnect() {

        if (this.socket) {

            console.log("[WS-DISCONNECT]", {
                socketInstanceId: this.socket.__linguaSyncSocketInstanceId,
                reason: "client_disconnect",
            });
            this.socket.close();

            this.socket = null;

        }

    }

    flushConversation(timeoutMs = 50000) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return Promise.resolve({ flushed: false, reason: "socket_not_open" });
        }

        return new Promise((resolve) => {
            const timeoutId = window.setTimeout(() => {
                if (this.flushResolver) {
                    this.flushResolver = null;
                    resolve({ flushed: false, reason: "timeout" });
                }
            }, timeoutMs);

            this.flushResolver = (result) => {
                window.clearTimeout(timeoutId);
                resolve(result);
            };
            this.socket.send(JSON.stringify({ type: "conversation_flush" }));
        });
    }

}

export default new WebSocketService();
