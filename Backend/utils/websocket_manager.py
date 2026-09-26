import asyncio
import json

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


async def send_live(
    job_id: str,
    payload: dict,
    stop_event: asyncio.Event
) -> bool:
    """Kirim ke klien sesi live (UDP). Socket yang sudah putus bukan galat
    di sini — itu cara normal sesi berakhir kalau tab ditutup — jadi
    kegagalan kirim cukup menghentikan sesi, bukan melempar exception yang
    akan tercetak sebagai traceback."""

    try:
        await manager.send(job_id, payload)
        return True
    except Exception:
        stop_event.set()
        return False


async def listen_for_stop(
    websocket: WebSocket,
    stop_event: asyncio.Event
):
    """Stream live tidak punya akhir alami seperti EOF berkas, jadi klien
    mengakhiri sesi dengan mengirim {"action": "stop"}. Socket yang putus
    (tab ditutup, pindah halaman) juga dianggap permintaan berhenti."""

    try:

        while True:

            text = await websocket.receive_text()

            try:
                message = json.loads(text)
            except ValueError:
                continue

            if isinstance(message, dict) and message.get("action") == "stop":
                break

    except Exception:
        # WebSocketDisconnect, atau pesan biner yang tidak kita harapkan.
        pass

    finally:
        stop_event.set()