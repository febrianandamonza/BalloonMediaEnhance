from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Form
import shutil
from pathlib import Path
import time

from services.enhancer import ImageEnhancer
from services.video_enhancer import VideoEnhancer
from utils.file_manager import FileManager
from utils.video_preview import build_browser_preview, check_image_resolution, check_video_resolution

from schemas.ai_schema import AIProcessResponse

router = APIRouter(
    prefix='/api/v1/enhance',
    tags={"Media Enhancement"}
)

enhancer = ImageEnhancer()
enhancer.load_model()

enhancer_video = VideoEnhancer()


@router.post("/preview")
async def enhance_video_preview(
    file: UploadFile = File(...)
):
    """Sama seperti /api/v1/detect/preview & /api/v1/crowd/preview — remux
    cepat ke MP4 supaya berkas yang tidak didukung native oleh <video>
    browser (utamanya .ts) tetap bisa ditampilkan sebagai pratinjau
    sebelum "Terapkan" ditekan."""

    preview_path = build_browser_preview(file)

    return {
        "success": True,
        "preview_url": FileManager.get_preview_url(preview_path)
    }


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

    input_path = FileManager.save_upload_file(file)

    # Sama seperti Video Analytic & Crowd Counting (lihat
    # utils/video_preview.py) — video di atas Full HD ditolak total,
    # bukan cuma peringatan. Dicek di LUAR try/except di bawah supaya
    # HTTPException 400-nya tidak ikut ketangkap dan dibungkus ulang
    # jadi 500 oleh except Exception generik di sana.
    try:
        check_video_resolution(input_path)
    except HTTPException:
        FileManager.delete_temp_file(input_path)
        raise

    try:
        # Hasil selalu di-encode ulang ffmpeg ke MP4, apa pun format
        # sumbernya (lihat catatan sama di api/detection.py &
        # api/crowd_counting_live.py) — SEBELUMNYA di sini memakai
        # file.filename asli, jadi unggahan .ts/.mov/.mkv dll menghasilkan
        # output_path berekstensi sama. video_enhancer.py menghitung
        # temp_video lewat output_video.replace(".mp4", "_temp.mp4"): kalau
        # output_video bukan .mp4, .replace() tidak menemukan apa pun untuk
        # diganti, jadi temp_video == output_video persis — ffmpeg lalu
        # menolak menulis ke berkas yang sama dengan yang sedang dibacanya
        # ("Output ... same as Input #0 - exiting"). Dipaksa "output.mp4"
        # di sini supaya selalu .mp4, sama seperti dua modul lain.
        output_path = FileManager.build_temp_file_path(
            "enhancement",
            "output.mp4"
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

    # Sama seperti batas resolusi video (lihat utils/video_preview.py).
    try:
        check_image_resolution(input_path)
    except HTTPException:
        FileManager.delete_temp_file(input_path)
        raise

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