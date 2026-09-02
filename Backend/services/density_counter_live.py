import asyncio
import base64
import math
import os
import subprocess
import time
import traceback

import cv2
import numpy as np

from utils.file_manager import FileManager
from utils.websocket_manager import manager


class VideoCrowdCounterLive:

    FRAME_INTERVAL = 10

    # Ukuran & kualitas JPEG khusus untuk umpan langsung ke browser — tidak
    # memengaruhi resolusi video keluaran yang ditulis ke disk. Mengirim
    # frame resolusi penuh lewat WebSocket di setiap frame video (~25-30x
    # per detik) adalah penyebab utama lag: encode JPEG + base64 + repaint
    # <img> di browser sebanyak itu jauh lebih berat daripada inferensi AI
    # itu sendiri.
    STREAM_MAX_WIDTH = 960
    STREAM_JPEG_QUALITY = 70

    def __init__(self, density_counter):

        self.counter = density_counter

    def _draw_count_overlay(self, frame_out, width, count):

        label = "Crowd Count"
        value = str(count)

        font = cv2.FONT_HERSHEY_SIMPLEX

        overlay = frame_out.copy()

        box_w = 260
        box_h = 90
        margin = 20

        x1 = width - box_w - margin
        y1 = margin
        x2 = width - margin
        y2 = margin + box_h

        cv2.rectangle(overlay, (x1, y1), (x2, y2), (0, 0, 0), -1)

        frame_out = cv2.addWeighted(overlay, 0.45, frame_out, 0.55, 0)

        cv2.putText(
            frame_out, label, (x1 + 20, y1 + 30),
            font, 0.8, (255, 255, 255), 2, cv2.LINE_AA
        )

        cv2.putText(
            frame_out, value, (x1 + 20, y1 + 72),
            font, 1.5, (0, 255, 255), 3, cv2.LINE_AA
        )

        return frame_out

    def _blend_heatmap(self, density_map, frame):
        """Blend a (mungkin basi) density map ke frame TERKINI — operasi
        OpenCV murah (resize/normalize/colormap/blend), bukan inferensi
        model, jadi aman dipanggil di setiap frame supaya video tetap
        mengikuti gerakan asli, bukan membekukan satu snapshot lama."""

        h, w = frame.shape[:2]

        resized = cv2.resize(density_map, (w, h))

        normalized = cv2.normalize(
            resized, None, 0, 255, cv2.NORM_MINMAX
        ).astype(np.uint8)

        heatmap = cv2.applyColorMap(normalized, cv2.COLORMAP_JET)

        return cv2.addWeighted(frame, 0.6, heatmap, 0.4, 0)

    async def predict_video_stream(
        self,
        job_id: str,
        input_video,
        output_video
    ):

        start = time.time()

        cap = cv2.VideoCapture(str(input_video))

        if not cap.isOpened():
            raise Exception("Cannot open video")

        fps = cap.get(cv2.CAP_PROP_FPS)

        if fps <= 0:
            fps = 25.0

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")

        temp_video = str(output_video).replace(".mp4", "_temp.mp4")

        writer = cv2.VideoWriter(
            temp_video,
            fourcc,
            fps,
            (width, height)
        )

        if not writer.isOpened():
            raise Exception("Failed to create VideoWriter")

        last_density_map = None
        last_count = 0
        counter_task = None

        frame_index = 0
        counts = []

        try:

            while True:

                ret, frame = cap.read()

                if not ret:
                    break

                if counter_task is not None and counter_task.done():

                    try:
                        last_density_map, raw_count, _ = counter_task.result()

                        # DM-Count mengembalikan jumlah densitas berupa
                        # pecahan (mis. 42.37). Operator hanya ingin melihat
                        # jiwa sebagai bilangan bulat, dan sisa densitas
                        # sekecil apa pun tetap mewakili bagian dari satu
                        # orang — jadi dibulatkan KE ATAS, bukan ke terdekat.
                        last_count = math.ceil(raw_count)
                    except Exception:
                        print(
                            f"[crowd] DM-Count error at frame {frame_index}:\n"
                            f"{traceback.format_exc()}"
                        )
                    finally:
                        counter_task = None

                if (
                    frame_index % self.FRAME_INTERVAL == 0
                    and counter_task is None
                ):
                    counter_task = asyncio.create_task(
                        asyncio.to_thread(
                            self.counter.predict_frame,
                            frame.copy()
                        )
                    )

                # Heatmap di-blend ulang ke frame TERKINI setiap iterasi
                # (bukan menampilkan ulang gambar beku dari inferensi lama)
                # supaya video tetap mengikuti gerakan asli dan tidak
                # terlihat patah-patah/macet.
                if last_density_map is not None:
                    annotated = self._blend_heatmap(last_density_map, frame)
                    count = last_count
                else:
                    annotated = frame.copy()
                    count = 0

                annotated = self._draw_count_overlay(annotated, width, count)

                writer.write(annotated)

                counts.append(count)

                stream_frame = annotated

                if width > self.STREAM_MAX_WIDTH:
                    ratio = self.STREAM_MAX_WIDTH / width
                    stream_frame = cv2.resize(
                        annotated,
                        (self.STREAM_MAX_WIDTH, int(height * ratio)),
                        interpolation=cv2.INTER_LINEAR
                    )

                success, buffer = cv2.imencode(
                    ".jpg",
                    stream_frame,
                    [cv2.IMWRITE_JPEG_QUALITY, self.STREAM_JPEG_QUALITY]
                )

                if success:

                    frame_base64 = base64.b64encode(buffer).decode()

                    progress = round(
                        (frame_index + 1) * 100 / total_frames, 2
                    )

                    await manager.send(
                        job_id,
                        {
                            "frame": frame_base64,
                            "count": count,
                            "progress": progress,
                            "frame_number": frame_index,
                            "total_frame": total_frames
                        }
                    )

                frame_index += 1

                # Kembalikan kendali ke event loop supaya task inferensi di
                # background sempat dicek/diselesaikan tanpa menunggu I/O.
                await asyncio.sleep(0)

        finally:

            if counter_task is not None:
                try:
                    await counter_task
                except Exception:
                    print(
                        "[crowd] Final DM-Count error:\n"
                        f"{traceback.format_exc()}"
                    )

            cap.release()
            writer.release()

            command = [
                "ffmpeg", "-y",
                "-i", temp_video,
                "-i", str(input_video),
                "-map", "0:v:0",
                "-map", "1:a?",
                "-c:v", "libx264",
                "-preset", "medium",
                "-crf", "23",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-b:a", "128k",
                "-movflags", "+faststart",
                str(output_video)
            ]

            result = subprocess.run(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            if result.returncode != 0:
                raise Exception("FFmpeg convert failed.")

            if os.path.exists(temp_video):
                os.remove(temp_video)

        if not counts:
            counts = [0]

        await manager.send(
            job_id,
            {
                "finished": True,
                "media_type": "VIDEO",
                "processing_type": "CROWD_COUNTING",
                "temp_path": str(output_video),
                "preview_url": FileManager.get_preview_url(output_video),
                "processing_time": round(time.time() - start, 2),
                "summary": {
                    "max_count": max(counts),
                    "min_count": min(counts),
                    "average_count": math.ceil(sum(counts) / len(counts)),
                    "last_count": counts[-1],
                    "total_frames": total_frames,
                    "fps": fps
                }
            }
        )
