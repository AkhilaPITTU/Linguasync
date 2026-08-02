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

        self.active_connections[meeting_id][user_id] = websocket

    # ==========================================
    # DISCONNECT
    # ==========================================

    def disconnect(
        self,
        meeting_id: str,
        user_id: str
    ):

        if meeting_id not in self.active_connections:
            return

        self.active_connections[meeting_id].pop(
            user_id,
            None
        )

        if not self.active_connections[meeting_id]:

            del self.active_connections[meeting_id]

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
            return

        try:

            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json(message)

        except Exception:

            self.disconnect(
                meeting_id,
                user_id
            )

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

        for user_id, websocket in connections.items():

            try:

                if websocket.client_state == WebSocketState.CONNECTED:
                    await websocket.send_json(message)

            except Exception:

                disconnected_users.append(user_id)

        for user_id in disconnected_users:

            self.disconnect(
                meeting_id,
                user_id
            )

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