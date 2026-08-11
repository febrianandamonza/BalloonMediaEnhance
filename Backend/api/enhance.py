from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Form
import shutil
from pathlib import Path
import time

from services.enhancer import ImageEnhancer
from services.video_enhancer import VideoEnhancer
from utils.file_manager import FileManager

from schemas.ai_schema import AIProcessResponse

router = APIRouter(
    prefix='/api/v1/enhance',
    tags={"Media Enhancement"}
)

enhancer = ImageEnhancer()
enhancer.load_model()

enhancer_video = VideoEnhancer()


@router.post(
    "/video",
    response_model=AIProcessResponse
)
async def enhance_video(
    file: UploadFile = File(...),
    mode: str = Query(
        default="fast",
        pattern="^(fast|quality)$"
    ),
    denoise: int = Form(20),
    contrast: int = Form(15),
    sharpness: int = Form(20)
):
    start = time.time()
    try:
        input_path = FileManager.save_upload_file(
            file
        )

        output_path = FileManager.build_temp_file_path(
            "enhancement",
            file.filename
        )

        enhancer_video.enhance_video(
            input_video=str(input_path),
            output_video=str(output_path),
            mode=mode,
            denoise=denoise,
            contrast=contrast,
            sharpness=sharpness

        )

        elapsed = round(
            time.time() - start,
            2
        )

        return {
            "success": True,
            "media_type": "VIDEO",
            "processing_type": "ENHANCEMENT",
            "temp_path": str(output_path),
            "preview_url": "/" + str(output_path).replace("\\", "/"),
            "processing_time": elapsed
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@router.post(
    "/image",
    response_model=AIProcessResponse
)
async def enhance(
    file: UploadFile = File(...)
):

    start = time.time()

    input_path = FileManager.save_upload_file(file)

    output_path = enhancer.enhance_image(
        str(input_path)
    )

    elapsed = round(
        time.time() - start,
        2
    )

    return {

        "success": True,

        "media_type": "IMAGE",

        "processing_type": "ENHANCEMENT",

        "temp_path": output_path,

        "preview_url": "/" + output_path.replace("\\", "/"),

        "processing_time": elapsed

    }