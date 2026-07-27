from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Form
import shutil
from pathlib import Path
import time

from services.enhancer import ImageEnhancer
from services.video_enhancer import VideoEnhancer
from utils.file_manager import FileManager

router = APIRouter(
    prefix='/api/v1/enhance',
    tags={"Media Enhancement"}
)

enhancer = ImageEnhancer()
enhancer.load_model()

enhancer_video = VideoEnhancer()


@router.post("/video")
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
    try:

        input_path = FileManager.save_upload_file(file)

        output_path = str(
            Path(
                FileManager.build_output_path(input_path)
            ).with_suffix(".mp4")
        )

        result = enhancer_video.enhance_video(
            input_video=input_path,
            output_video=output_path,
            mode=mode,
            denoise=denoise,
            contrast=contrast,
            sharpness=sharpness
        )

        return {
            "success": True,
            "message": "Video enhanced successfully.",
            "output_path": output_path,
            **result
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@router.post("/image")
async def enhance(file: UploadFile = File(...)):
    start = time.time()
    input_dir = Path("input")
    input_dir.mkdir(exist_ok=True)

    input_path = input_dir / file.filename

    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    output_path = enhancer.enhance_image(str(input_path))
    elapsed = round(time.time() - start, 2)

    file_name = Path(output_path).name

    return {
        "success": True,
        "file_name": file_name,
        "image_url": f"http://127.0.0.1:8000/output/{file_name}",
        "processing_time": elapsed
    }