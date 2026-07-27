from pathlib import Path
import shutil
import time
import cv2

import uuid
import asyncio

from fastapi import APIRouter, UploadFile, File, WebSocket, WebSocketDisconnect, BackgroundTasks

from services.detector import ObjectDetector
from services.enhancer import ImageEnhancer
from utils.file_manager import FileManager
from core.websocket_manager import manager

router = APIRouter(
    prefix="/api/v1/detect",
    tags=["Object Detection"]
)

detector = ObjectDetector()
detector.load_model()

enhancer = ImageEnhancer()
enhancer.load_model()

video_jobs = {}


@router.post("/video")
async def detect_video(
    file: UploadFile = File(...)
):

    job_id = str(uuid.uuid4())

    video_path = FileManager.save_upload_file(file)

    video_jobs[job_id] = video_path

    return {
        "success": True,
        "job_id": job_id
    }

@router.post("/image")
async def detect(file: UploadFile = File(...)):

    start = time.time()

    input_dir = Path("input")
    input_dir.mkdir(exist_ok=True)

    input_path = input_dir / file.filename

    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # enhanced_path = enhancer.enhance_image(str(input_path))

    output_path, objects = detector.detect_image(
        input_path
        # enhanced_path
    )

    elapsed = round(time.time() - start, 2)

    file_name = Path(output_path).name

    return {
        "success": True,
        "image_url": f"/output/{file_name}",
        "processing_time": elapsed,
        "objects": objects
    }

@router.websocket("/ws/{job_id}")
async def websocket_detect(
    websocket: WebSocket,
    job_id: str
):

    await manager.connect(job_id, websocket)

    try:

        video_path = video_jobs.get(job_id)

        if video_path is None:

            await manager.send(
                job_id,
                {
                    "error": "Job ID not found."
                }
            )

            return

        await detector.detect_video_stream(
            job_id,
            video_path
        )

    except WebSocketDisconnect:

        print("Client disconnected.")

    finally:

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