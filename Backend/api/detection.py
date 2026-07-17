from pathlib import Path
import shutil
import time
import cv2

from fastapi import APIRouter, UploadFile, File

from services.detector import ObjectDetector
from services.enhancer import ImageEnhancer
from utils.file_manager import FileManager

router = APIRouter(
    prefix="/api/v1/detect",
    tags=["Object Detection"]
)

detector = ObjectDetector()
detector.load_model()

enhancer = ImageEnhancer()
enhancer.load_model()


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
        str(input_path)
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