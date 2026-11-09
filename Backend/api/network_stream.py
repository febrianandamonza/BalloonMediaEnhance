import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect

# JWT di-hide sementara untuk endpoint stream (lihat start_stream/stop_stream)
# from dependencies.authentication import get_current_user
from services.live_passthrough import stream_live_passthrough
from services.network_stream_service import network_stream_service
from schemas.network_stream_schema import (
    StartStreamRequest,
    StartStreamResponse,
    StopStreamResponse,
    StreamJobRequest,
    StreamJobResponse,
)
from utils.websocket_manager import listen_for_stop, manager

router = APIRouter(
    prefix="/api/v1/network-stream",
    tags=["Network Stream"]
)

# Sesi Live Stream (WebSocket) yang sudah dibuat lewat POST /live tapi
# socketnya belum tersambung / masih berjalan.
live_jobs: dict[str, dict] = {}


# ----------------------------------------------------------------------
# Live Stream realtime — jalur yang dipakai halaman Live Stream.
# Polanya sama dengan /crowd/stream + /crowd/ws/{job_id}, tanpa AI.
# ----------------------------------------------------------------------

@router.post(
    "/live",
    response_model=StreamJobResponse
)
async def start_live_job(payload: StreamJobRequest):
    # Sumber baru dibuka saat WebSocket tersambung, bukan di sini: membuka
    # udp://@0.0.0.0:<port> berarti bind port tersebut, dan membukanya dua
    # kali bisa bentrok (sama seperti /crowd/stream).

    network_url = network_stream_service.validate_udp_url(
        payload.network_url
    )

    job_id = str(uuid.uuid4())

    live_jobs[job_id] = {"input": network_url}

    return {
        "success": True,
        "job_id": job_id
    }


@router.websocket("/ws/{job_id}")
async def websocket_live_stream(
    websocket: WebSocket,
    job_id: str
):

    await manager.connect(job_id, websocket)

    stop_listener = None

    try:

        job = live_jobs.get(job_id)

        if job is None:
            await manager.send(job_id, {"error": "Job not found."})
            return

        stop_event = asyncio.Event()

        stop_listener = asyncio.create_task(
            listen_for_stop(websocket, stop_event)
        )

        await stream_live_passthrough(job_id, job["input"], stop_event)

    except WebSocketDisconnect:

        print("Client disconnected.")

    finally:

        if stop_listener is not None:
            stop_listener.cancel()

        manager.disconnect(job_id)

        live_jobs.pop(job_id, None)


# ----------------------------------------------------------------------
# Jalur lama FFmpeg → HLS. Tidak lagi dipakai halaman Live Stream
# (delay-nya beberapa detik), disimpan untuk kompatibilitas klien lain.
# ----------------------------------------------------------------------

@router.post(
    "/start",
    response_model=StartStreamResponse
)
def start_stream(
    payload: StartStreamRequest,
    # current_user=Depends(get_current_user)
):

    if not network_stream_service.ffmpeg_available():

        raise HTTPException(
            status_code=500,
            detail="FFmpeg tidak ditemukan di server. Install FFmpeg dulu."
        )

    stream_id, playlist_url = network_stream_service.start_stream(
        payload.network_url
    )

    return StartStreamResponse(
        stream_id=stream_id,
        playlist_url=playlist_url
    )


@router.post(
    "/stop/{stream_id}",
    response_model=StopStreamResponse
)
def stop_stream(
    stream_id: str,
    # current_user=Depends(get_current_user)
):

    network_stream_service.stop_stream(stream_id)

    return StopStreamResponse(
        success=True,
        message="Stream dihentikan.",
        stream_id=stream_id
    )


@router.get("/health")
def health():

    return network_stream_service.health()
