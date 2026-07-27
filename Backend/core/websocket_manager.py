from fastapi import WebSocket
from typing import Dict


class WebSocketManager:

    def __init__(self):
        self.connections: Dict[str, WebSocket] = {}

    async def connect(
        self,
        job_id: str,
        websocket: WebSocket
    ):
        await websocket.accept()

        self.connections[job_id] = websocket

        print(f"[WS] Connected : {job_id}")

    def disconnect(
        self,
        job_id: str
    ):

        if job_id in self.connections:
            del self.connections[job_id]

        print(f"[WS] Disconnected : {job_id}")

    async def send(self, job_id: str, data: dict):
        websocket = self.connections.get(job_id)

        print(f"Send -> {job_id}")
        print(f"Found websocket: {websocket is not None}")

        if websocket:
            await websocket.send_json(data)
            print("Message sent")
        else:
            print("No websocket found")

    def exists(
        self,
        job_id: str
    ) -> bool:

        return job_id in self.connections


manager = WebSocketManager()