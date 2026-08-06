class WebSocketService {

    constructor() {
        this.socket = null;
    }

    connect(meetingId, userId, onMessage) {

        return new Promise((resolve, reject) => {

            if (this.socket) {
                this.socket.close();
            }

            const wsUrl =
                `ws://localhost:8000/ws/meeting/${meetingId}/${userId}`;

            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => {

                console.log("✅ WebSocket Connected");
                this.send({
                    type: "join",
                    meeting_id: meetingId,
                    user_id: userId
            });

                resolve();

            };

            this.socket.onmessage = (event) => {

                const data = JSON.parse(event.data);

                console.log("📨 WS:", data.type, data);

                if (onMessage) {
                    onMessage(data);
                }

            };

            this.socket.onerror = (error) => {

                console.error(error);

                reject(error);

            };

            this.socket.onclose = (event) => {

                console.log("WebSocket Closed");

                console.log(event.code);

                console.log(event.reason);

                this.socket = null;

            };

        });

    }

    send(data) {

        if (
            this.socket &&
            this.socket.readyState === WebSocket.OPEN
        ) {

            this.socket.send(JSON.stringify(data));

        }

    }

    disconnect() {

        if (this.socket) {

            this.socket.close();

            this.socket = null;

        }

    }

}

export default new WebSocketService();