import uuid

from fastapi import APIRouter, UploadFile, File, WebSocket, WebSocketDisconnect

from api.crowd_counting import density_counter
from services.density_counter_live import VideoCrowdCounterLive
from utils.file_manager import FileManager
from utils.websocket_manager import manager

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

    output_path = FileManager.build_temp_file_path(
        "crowd_counting",
        file.filename
    )

    video_jobs[job_id] = {
        "input": str(input_path),
        "output": str(output_path)
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

        await live_counter.predict_video_stream(

            job_id,

            job["input"],

            job["output"]

        )

    except WebSocketDisconnect:

        print("Client disconnected.")

    finally:

        manager.disconnect(job_id)

        if job_id in video_jobs:
            del video_jobs[job_id]
