from collections import defaultdict

from fastapi import WebSocket
from starlette.websockets import WebSocketState


class ConnectionManager:

    def __init__(self):

        # meeting_id -> {user_id: websocket}
        self.active_connections = defaultdict(dict)

    # ==========================================
    # CONNECT
    # ==========================================

    async def connect(
        self,
        meeting_id: str,
        user_id: str,
        websocket: WebSocket
    ):

        await websocket.accept()

        previous_socket = self.active_connections[meeting_id].get(user_id)
        self.active_connections[meeting_id][user_id] = websocket
        print(
            f"[WS-CONNECT] meeting_id={meeting_id} user_id={user_id} "
            f"socket_instance_id={id(websocket)} "
            f"replaced_socket_instance_id="
            f"{id(previous_socket) if previous_socket is not None else None}"
        )

    # ==========================================
    # DISCONNECT
    # ==========================================

    def disconnect(
        self,
        meeting_id: str,
        user_id: str,
        websocket: WebSocket | None = None,
    ):

        if meeting_id not in self.active_connections:
            return False

        current_socket = self.active_connections[meeting_id].get(user_id)

        # A reconnect replaces this user's socket. A superseded socket must
        # not later remove that replacement or announce a false user_left.
        if websocket is not None and current_socket is not websocket:
            print(
                f"[WS-DISCONNECT] meeting_id={meeting_id} user_id={user_id} "
                f"socket_instance_id={id(websocket)} "
                f"current_registered_socket={id(current_socket) if current_socket else None} "
                f"is_stale=True"
            )
            return False

        print(
            f"[WS-DISCONNECT] meeting_id={meeting_id} user_id={user_id} "
            f"socket_instance_id={id(websocket) if websocket is not None else id(current_socket) if current_socket else None} "
            f"current_registered_socket={id(current_socket) if current_socket else None} "
            f"is_stale=False"
        )

        self.active_connections[meeting_id].pop(user_id, None)

        if not self.active_connections[meeting_id]:

            del self.active_connections[meeting_id]

        return True

    # ==========================================
    # SEND TO ONE USER
    # ==========================================

    async def send_personal_message(
        self,
        message: dict,
        meeting_id: str,
        user_id: str
    ):

        websocket = self.active_connections.get(
            meeting_id,
            {}
        ).get(user_id)

        if websocket is None:
            return False

        try:

            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json(message)
                return True

        except Exception:

            # Use the socket captured above. A reconnect may replace this
            # mapping while send_json is awaiting, and the old socket must
            # never remove the replacement.
            self.disconnect(meeting_id, user_id, websocket)

        return False

    # ==========================================
    # BROADCAST
    # ==========================================

    async def broadcast(
        self,
        meeting_id: str,
        message: dict
    ):

        connections = self.active_connections.get(
            meeting_id,
            {}
        )

        disconnected_users = []
        delivered_users = []

        # A new browser can connect while an awaited send is in progress.
        # Iterate a snapshot so that connection changes cannot interrupt a
        # meeting-wide transcript dispatch part way through its recipients.
        for user_id, websocket in list(connections.items()):

            try:

                if websocket.client_state == WebSocketState.CONNECTED:
                    await websocket.send_json(message)
                    delivered_users.append(user_id)

            except Exception:

                disconnected_users.append((user_id, websocket))

        for user_id, websocket in disconnected_users:

            self.disconnect(
                meeting_id,
                user_id,
                websocket,
            )

        return delivered_users

    # ==========================================
    # PARTICIPANT COUNT
    # ==========================================

    def participant_count(
        self,
        meeting_id: str
    ):

        return len(

            self.active_connections.get(

                meeting_id,

                {}

            )

        )

    # ==========================================
    # GET PARTICIPANTS
    # ==========================================

    def get_participants(
        self,
        meeting_id: str
    ):

        return list(

            self.active_connections.get(

                meeting_id,

                {}

            ).keys()

        )

    # ==========================================
    # USER EXISTS
    # ==========================================

    def user_exists(
        self,
        meeting_id: str,
        user_id: str
    ):

        return user_id in self.active_connections.get(
            meeting_id,
            {}
        )

    # ==========================================
    # GET ALL MEETINGS
    # ==========================================

    def get_active_meetings(self):

        return list(self.active_connections.keys())


manager = ConnectionManager()
