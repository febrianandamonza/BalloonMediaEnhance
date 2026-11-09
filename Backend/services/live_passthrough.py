"""Live Stream tanpa AI — jalur yang sama dengan sesi live Crowd Counting
dan Video Analytic (predict_live_stream / detect_live_stream), hanya tanpa
inferensi.

Sebelumnya modul Live Stream memakai FFmpeg → HLS → hls.js. HLS memotong
video menjadi segmen dan player menahan beberapa segmen sebelum memutar,
jadi delay-nya minimal beberapa detik dan menumpuk setiap kali jaringan
tersendat. Di sini frame dibaca LatestFrameReader (selalu frame TERBARU,
frame tertunggak dilompati), di-encode JPEG, lalu dikirim lewat WebSocket.
Hanya satu kiriman yang boleh berjalan; frame yang datang selagi kiriman
sebelumnya belum selesai dibuang — klien lambat tidak pernah membuat delay
bertambah.
"""

import asyncio
import base64
import time
import traceback
from datetime import datetime

import cv2

from utils.live_capture import (
    LIVE_OPEN_TIMEOUT_MS,
    LIVE_POLL_INTERVAL,
    LIVE_READ_TIMEOUT_MS,
    LIVE_SOURCE_LOST_SECONDS,
    LatestFrameReader,
    open_failed_message,
    resolution_rejected_message,
)
from utils.video_preview import MAX_VIDEO_WIDTH, MAX_VIDEO_HEIGHT
from utils.websocket_manager import send_live


# Sedikit lebih tajam dari umpan crowd counting (960 / 70) karena di sini
# video itu sendiri yang jadi fokus, bukan overlay hasil AI. Tetap dibatasi
# supaya encode JPEG + base64 + repaint <img> di browser sanggup mengikuti
# 25–30 fps.
STREAM_MAX_WIDTH = 1280
STREAM_JPEG_QUALITY = 75


def _encode_frame(frame):
    """JPEG base64, diperkecil ke STREAM_MAX_WIDTH. None kalau gagal."""

    height, width = frame.shape[:2]

    if width > STREAM_MAX_WIDTH:
        ratio = STREAM_MAX_WIDTH / width
        frame = cv2.resize(
            frame,
            (STREAM_MAX_WIDTH, int(height * ratio)),
            interpolation=cv2.INTER_LINEAR
        )

    success, buffer = cv2.imencode(
        ".jpg",
        frame,
        [cv2.IMWRITE_JPEG_QUALITY, STREAM_JPEG_QUALITY]
    )

    if not success:
        return None

    return base64.b64encode(buffer).decode()


async def _encode_and_send(job_id, frame, meta, stop_event):

    frame_base64 = await asyncio.to_thread(_encode_frame, frame)

    if frame_base64 is None:
        return

    await send_live(
        job_id,
        {
            "frame": frame_base64,
            "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3],
            **meta
        },
        stop_event
    )


async def stream_live_passthrough(
    job_id: str,
    network_url: str,
    stop_event: asyncio.Event
):
    """Sesi berakhir karena klien mengirim {"action": "stop"}, socket
    putus, atau sumber diam selama LIVE_SOURCE_LOST_SECONDS."""

    start = time.time()

    reader = LatestFrameReader(
        network_url,
        open_timeout_ms=LIVE_OPEN_TIMEOUT_MS,
        read_timeout_ms=LIVE_READ_TIMEOUT_MS
    )

    try:

        opened = await asyncio.to_thread(reader.open)

        if not opened:
            await send_live(
                job_id,
                {"error": open_failed_message(network_url)},
                stop_event
            )
            return

        if reader.width > MAX_VIDEO_WIDTH or reader.height > MAX_VIDEO_HEIGHT:
            await send_live(
                job_id,
                {
                    "error": resolution_rejected_message(
                        reader.width,
                        reader.height
                    )
                },
                stop_event
            )
            return

        print(
            f"[live-stream] tersambung ke {network_url} "
            f"({reader.width}x{reader.height} "
            f"@ {reader.fps:.2f}fps dilaporkan sumber)"
        )

        send_task = None
        last_seq = 0
        frame_index = 0
        sent_frames = 0
        first_frame_at = None
        last_frame_at = None
        end_reason = "stopped"

        try:

            while not stop_event.is_set():

                seq, frame = reader.latest()

                if seq == last_seq:

                    if (
                        reader.seconds_since_last_frame()
                        > LIVE_SOURCE_LOST_SECONDS
                    ):
                        end_reason = "source_lost"
                        break

                    await asyncio.sleep(LIVE_POLL_INTERVAL)
                    continue

                last_seq = seq
                last_frame_at = time.time()

                if first_frame_at is None:
                    first_frame_at = last_frame_at

                # Satu kiriman pada satu waktu; kalau masih berjalan, frame
                # ini dilewati — frame berikutnya pasti lebih baru.
                if send_task is None or send_task.done():

                    if send_task is not None:
                        try:
                            send_task.result()
                        except Exception:
                            print(
                                "[live-stream] Encode/WS error:\n"
                                f"{traceback.format_exc()}"
                            )

                    meta = {
                        "live": True,
                        "frame_number": frame_index,
                        "width": reader.width,
                        "height": reader.height,
                        "elapsed_seconds": round(time.time() - start, 1),
                    }

                    # Frame dari reader tidak ditimpa thread pembaca
                    # (cap.read() mengalokasikan array baru) dan tidak
                    # digambari, jadi tidak perlu di-copy.
                    send_task = asyncio.create_task(
                        _encode_and_send(job_id, frame, meta, stop_event)
                    )
                    sent_frames += 1

                frame_index += 1

                await asyncio.sleep(0)

        finally:

            if send_task is not None:
                try:
                    await send_task
                except Exception:
                    print(
                        "[live-stream] Final encode/WS error:\n"
                        f"{traceback.format_exc()}"
                    )

        streaming_seconds = (
            last_frame_at - first_frame_at
            if first_frame_at is not None
            else 0
        )

        print(
            f"[live-stream] selesai ({end_reason}) | "
            f"{frame_index} frame diterima, {sent_frames} dikirim "
            f"dalam {streaming_seconds:.1f}s"
        )

        await send_live(
            job_id,
            {
                "finished": True,
                "live": True,
                "reason": end_reason,
                "summary": {
                    "received_frames": frame_index,
                    "sent_frames": sent_frames,
                    "duration_seconds": round(streaming_seconds, 1),
                    "fps": (
                        round(sent_frames / streaming_seconds, 2)
                        if streaming_seconds > 0
                        else 0
                    ),
                },
            },
            stop_event
        )

    finally:

        reader.stop()

        await asyncio.to_thread(reader.join)
