from fastapi import APIRouter, UploadFile, File, Query
from pathlib import Path
import shutil

from services.density_counter import DensityCounter
from services.video_density_counter import VideoCrowdCounter
from utils.file_manager import FileManager

router = APIRouter(
    prefix="/crowd",
    tags=["Crowd Counting"]
)

density_counter = DensityCounter()
video_counter = VideoCrowdCounter(density_counter)


@router.post("/video")
async def predict_video(
    file: UploadFile = File(...),
    show_count: str = Query(
        default="true",
        pattern="^(true|false)$"
    ),
):
    input_path = FileManager.save_upload_file(file)
    output_path = FileManager.build_output_path(input_path)

    result = video_counter.predict_video(
        input_path,
        output_path,
        show_count=show_count
    )

    return {
    "success": True,
    "summary": result["summary"],
    "timeline": result["timeline"],
    "video": output_path
}

@router.post("/image")
async def density_count_image(file: UploadFile = File(...)):

    input_path = FileManager.save_upload_file(file)
    output_path = FileManager.build_output_path(input_path)

    result = density_counter.predict_image(
    input_path,
    output_path)

    return {
        "success": True,
        **result
    }