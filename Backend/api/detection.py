from pathlib import Path
import shutil
import time
import cv2

import uuid
import asyncio

from fastapi import APIRouter, UploadFile, File, WebSocket, WebSocketDisconnect, BackgroundTasks

from schemas.network_stream_schema import (
    StreamJobRequest,
    StreamJobResponse,
)
from services.detector import ObjectDetector
from services.network_stream_service import network_stream_service
from utils.file_manager import FileManager
from utils.websocket_manager import listen_for_stop, manager

router = APIRouter(
    prefix="/api/v1/detect",
    tags=["Object Detection"]
)

detector = ObjectDetector()
detector.load_model()

video_jobs = {}


@router.post("/video")
async def detect_video(
    file: UploadFile = File(...)
):

    job_id = str(uuid.uuid4())

    input_path = FileManager.save_upload_file(file)

    # Hasil selalu di-encode ulang ffmpeg ke MP4 — lihat catatan yang sama
    # di api/crowd_counting_live.py.
    output_path = FileManager.build_temp_file_path(
        "detection",
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
async def detect_stream(
    payload: StreamJobRequest
):
    # Sama seperti /crowd/stream: sumber baru dibuka saat WebSocket
    # tersambung, supaya port UDP tidak di-bind dua kali.

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

@router.post("/image")
async def detect(file: UploadFile = File(...)):

    start = time.time()

    # input_dir = Path("input")
    # input_dir.mkdir(exist_ok=True)

    # input_path = input_dir / file.filename

    # with open(input_path, "wb") as buffer:
    #     shutil.copyfileobj(file.file, buffer)

    # enhanced_path = enhancer.enhance_image(str(input_path))

    input_path = FileManager.save_upload_file(file)

    output_path, objects = detector.detect_image(
        str(input_path)
    )

    elapsed = round(time.time() - start, 2)

    file_name = Path(output_path).name

    return {

        "success": True,

        "media_type": "IMAGE",

        "processing_type": "OBJECT_DETECTION",

        "temp_path": output_path,

        "preview_url": FileManager.get_preview_url(
            output_path
        ),

        "processing_time": elapsed,

        "objects": objects

    }

@router.websocket("/ws/{job_id}")
async def websocket_detect(
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

            await detector.detect_live_stream(
                job_id,
                job["input"],
                stop_event
            )

            return

        await detector.detect_video_stream(

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

# @router.get("/test/{job_id}")
# async def test(job_id: str):

#     await manager.send(
#         job_id,
#         {
#             "message": "Halo dari backend",
#             "progress": 10
#         }
#     )

#     return {"success": True}
