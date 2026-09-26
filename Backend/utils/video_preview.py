"""Pratinjau video di sisi klien & batas resolusi unggahan (video maupun
gambar) — dipakai bersama oleh Video/Image Analytic (api/detection.py),
Crowd Counting (api/crowd_counting_live.py), dan Enhancement
(api/enhance.py) supaya perilakunya konsisten di seluruh aplikasi, bukan
diduplikasi/berbeda-beda tiap modul.
"""

import subprocess
from pathlib import Path

import cv2
from fastapi import HTTPException, UploadFile

from utils.file_manager import FileManager

# Batas ukuran unggahan — video/gambar di atas Full HD (mis. drone 4K)
# terbukti jauh lebih berat diproses real-time — lihat catatan
# MSMF/pre-resize di services/detector.py. Nama konstanta menyebut
# "VIDEO" karena awalnya ditulis khusus video, tapi limitnya sengaja
# dipakai sama untuk gambar (check_image_resolution) juga.
MAX_VIDEO_WIDTH = 1920
MAX_VIDEO_HEIGHT = 1080


def check_video_resolution(path) -> None:
    """Lempar HTTPException 400 kalau video di `path` melebihi
    MAX_VIDEO_WIDTH/HEIGHT. Tidak menghapus berkasnya — pemanggil yang
    memutuskan apa yang perlu dibersihkan setelah penolakan."""

    cap = cv2.VideoCapture(str(path))

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    cap.release()

    if width > MAX_VIDEO_WIDTH or height > MAX_VIDEO_HEIGHT:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Resolusi video {width}x{height} melebihi batas "
                f"maksimum {MAX_VIDEO_WIDTH}x{MAX_VIDEO_HEIGHT} (Full HD). "
                "Gunakan video dengan resolusi Full HD ke bawah."
            )
        )


def check_image_resolution(path) -> None:
    """Sama seperti check_video_resolution, untuk gambar tunggal (dibaca
    lewat cv2.imread, bukan VideoCapture). Gambar yang gagal dibaca
    (rusak/format tidak didukung) sengaja dibiarkan lolos di sini — itu
    urusan endpoint pemanggil (mis. detect_image/enhance_image) yang
    sudah punya penanganannya sendiri untuk berkas tidak valid."""

    image = cv2.imread(str(path))

    if image is None:
        return

    height, width = image.shape[:2]

    if width > MAX_VIDEO_WIDTH or height > MAX_VIDEO_HEIGHT:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Resolusi gambar {width}x{height} melebihi batas "
                f"maksimum {MAX_VIDEO_WIDTH}x{MAX_VIDEO_HEIGHT} (Full HD). "
                "Gunakan gambar dengan resolusi Full HD ke bawah."
            )
        )


def build_browser_preview(upload_file: UploadFile) -> Path:
    """Upload lalu remux ke MP4 supaya bisa diputar tag <video> di browser.

    Dipakai khusus untuk format yang tidak didukung native oleh Chrome/
    Edge/Firefox di luar manifest HLS — utamanya .ts (MPEG-TS mentah).
    `-c copy` cuma mengganti container tanpa re-encode, jadi tetap cepat
    walau berkasnya besar (beda dengan konversi hasil deteksi yang
    memang re-encode ke H.264 untuk pemampatan/kompatibilitas).

    Resolusi dicek SEBELUM remux (bukan setelah) supaya video yang sudah
    pasti akan ditolak nanti saat sesi benar-benar dimulai tidak
    membuang waktu di-remux dulu. Berkas upload mentahnya dibuang setelah
    ini — endpoint ini KHUSUS pratinjau; unggahan sungguhan untuk
    deteksi/crowd counting tetap terjadi terpisah saat sesi dimulai."""

    raw_path = FileManager.save_upload_file(upload_file)

    try:
        check_video_resolution(raw_path)
    except HTTPException:
        FileManager.delete_temp_file(raw_path)
        raise

    preview_path = FileManager.build_temp_file_path("preview", "preview.mp4")

    command = [
        "ffmpeg",
        "-y",
        "-i", str(raw_path),
        "-c", "copy",
        "-movflags", "+faststart",
        str(preview_path),
    ]

    result = subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    FileManager.delete_temp_file(raw_path)

    if result.returncode != 0:

        raise HTTPException(
            status_code=500,
            detail="Gagal membuat pratinjau video."
        )

    return preview_path
