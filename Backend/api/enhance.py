from fastapi import APIRouter, UploadFile, File
import shutil
from pathlib import Path
import time

from services.enhancer import ImageEnhancer

router = APIRouter(
    prefix='/api/v1/enhance',
    tags={"Image Enhancement"}
)

enhancer = ImageEnhancer()
enhancer.load_model()


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