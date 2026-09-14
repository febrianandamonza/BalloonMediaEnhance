import asyncio
import uuid

from fastapi import APIRouter, UploadFile, File, WebSocket, WebSocketDisconnect

from api.crowd_counting import density_counter
from schemas.network_stream_schema import (
    StreamJobRequest,
    StreamJobResponse,
)
from services.density_counter_live import VideoCrowdCounterLive
from services.network_stream_service import network_stream_service
from utils.file_manager import FileManager
from utils.websocket_manager import listen_for_stop, manager

router = APIRouter(
    prefix="/api/v1/crowd",
    tags=["Crowd Counting Live"]
)

live_counter = VideoCrowdCounterLive(density_counter)

video_jobs = {}


@router.post("/video")
async def start_video_job(
    file: UploadFile = File(...)
):

    job_id = str(uuid.uuid4())

    input_path = FileManager.save_upload_file(file)

    # Hasil selalu di-encode ulang ffmpeg ke H.264/AAC (MP4), apa pun format
    # sumbernya (.ts, .mkv, ...). Menyalin ekstensi sumber membuat path
    # "_temp.mp4" sama dengan path hasil sehingga ffmpeg gagal, dan berkas
    # .ts tidak bisa diputar browser/terdeteksi sebagai VIDEO saat disimpan.
    output_path = FileManager.build_temp_file_path(
        "crowd_counting",
        "output.mp4"
    )

    video_jobs[job_id] = {
        "input": str(input_path),
        "output": str(output_path)
    }

    return {
        "success": True,
        "job_id": job_id
    }


@router.post(
    "/stream",
    response_model=StreamJobResponse
)
async def start_stream_job(
    payload: StreamJobRequest
):
    # Sumber baru dibuka saat WebSocket tersambung, bukan di sini: membuka
    # udp://@0.0.0.0:<port> berarti bind port tersebut, dan membukanya dua
    # kali (sekali untuk cek, sekali untuk sesi) bisa bentrok.

    network_url = network_stream_service.validate_udp_url(
        payload.network_url
    )

    job_id = str(uuid.uuid4())

    video_jobs[job_id] = {
        "live": True,
        "input": network_url
    }

    return {
        "success": True,
        "job_id": job_id
    }


@router.websocket("/ws/{job_id}")
async def websocket_predict_video(
    websocket: WebSocket,
    job_id: str
):

    await manager.connect(job_id, websocket)

    stop_listener = None

    try:

        job = video_jobs.get(job_id)

        if job is None:

            await manager.send(
                job_id,
                {
                    "error": "Job not found."
                }
            )

            return

        if job.get("live"):

            stop_event = asyncio.Event()

            stop_listener = asyncio.create_task(
                listen_for_stop(websocket, stop_event)
            )

            await live_counter.predict_live_stream(
                job_id,
                job["input"],
                stop_event
            )

            return

        await live_counter.predict_video_stream(

            job_id,

            job["input"],

            job["output"]

        )

    except WebSocketDisconnect:

        print("Client disconnected.")

    finally:

        if stop_listener is not None:
            stop_listener.cancel()

        manager.disconnect(job_id)

        if job_id in video_jobs:
            del video_jobs[job_id]
