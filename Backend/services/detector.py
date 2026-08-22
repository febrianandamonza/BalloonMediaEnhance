from ultralytics import YOLO
import cv2
import base64
import asyncio
from datetime import datetime

import os
import time
import subprocess

from pathlib import Path

from utils.file_manager import FileManager
from utils.websocket_manager import manager

BASE_DIR = Path(__file__).resolve().parent.parent

WEIGHTS_DIR = BASE_DIR / "weights"

YOLO_WEIGHT = WEIGHTS_DIR / "yolo11x.pt"

class ObjectDetector:

    FRAME_INTERVAL = 25

    CLASS_MAPPING = {
        "person": "person",

        "car": "vehicle",
        # "bus": "vehicle",
        # "truck": "vehicle",
        "motorcycle": "vehicle",
        # "bicycle": "vehicle",
    }

    def __init__(self):
        self.model = None

    def load_model(self):

        print("Loading YOLO model...")

        if not YOLO_WEIGHT.exists():
            raise FileNotFoundError(
                f"YOLO weight not found: {YOLO_WEIGHT}"
            )

        self.model = YOLO(str(YOLO_WEIGHT))

    print("YOLO model loaded.")

    def read_image(self, image_path):

        image_path = str(image_path)
        
        image = cv2.imread(image_path)

        if image is None:
            raise Exception("Image tidak ditemukan")
        
        return image
    
    def detect_frame(self, frame):

        results = self.model.predict(
            source=frame,
            conf=0.10,
            imgsz=1280,
            verbose=False
        )

        return results

    # async def detect_video_stream(
    #     self,
    #     job_id: str,
    #     input_video,
    #     output_video
    # ):
    #     start = time.time()

    #     cap = cv2.VideoCapture(str(input_video))

    #     if not cap.isOpened():
    #         raise Exception("Cannot open video")

    #     fps = cap.get(cv2.CAP_PROP_FPS)

    #     if fps <= 0:
    #         fps = 25.0

    #     total_frames = int(
    #         cap.get(cv2.CAP_PROP_FRAME_COUNT)
    #     )

    #     width = int(
    #         cap.get(cv2.CAP_PROP_FRAME_WIDTH)
    #     )

    #     height = int(
    #         cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
    #     )

    #     print("=" * 80)
    #     print(f"Video FPS       : {fps}")
    #     print(f"Total Frames    : {total_frames}")
    #     print(f"Frame Duration  : {1 / fps:.4f}s")
    #     print(f"YOLO Interval   : 25 frames")
    #     print("=" * 80)

    #     fourcc = cv2.VideoWriter_fourcc(*"mp4v")

    #     temp_video = output_video.replace(
    #         ".mp4",
    #         "_temp.mp4"
    #     )

    #     writer = cv2.VideoWriter(
    #         temp_video,
    #         fourcc,
    #         fps,
    #         (width, height)
    #     )

    #     if not writer.isOpened():
    #         raise Exception(
    #             "Failed to create VideoWriter"
    #         )

    #     # ============================================================
    #     # CONFIG
    #     # ============================================================

    #     FRAME_INTERVAL = 25

    #     # 25 FPS = 0.04 second/frame
    #     frame_duration = 1.0 / fps

    #     # Hasil YOLO terakhir
    #     last_results = None

    #     # Task YOLO yang sedang berjalan
    #     yolo_task = None

    #     frame_index = 0

    #     # Untuk menjaga timing WebSocket
    #     next_frame_time = time.perf_counter()

    #     try:

    #         while True:

    #             # ====================================================
    #             # READ FRAME
    #             # ====================================================

    #             ret, frame = cap.read()

    #             if not ret:
    #                 break

    #             frame_start = time.perf_counter()

    #             # ====================================================
    #             # CHECK YOLO RESULT
    #             #
    #             # Kalau YOLO sebelumnya sudah selesai,
    #             # ambil hasilnya.
    #             # ====================================================

    #             if (
    #                 yolo_task is not None
    #                 and yolo_task.done()
    #             ):

    #                 try:

    #                     last_results = yolo_task.result()

    #                     print(
    #                         f"YOLO completed "
    #                         f"at frame {frame_index}"
    #                     )

    #                 except Exception as e:

    #                     print(
    #                         f"YOLO error: {e}"
    #                     )

    #                 finally:

    #                     yolo_task = None

    #             # ====================================================
    #             # START YOLO
    #             #
    #             # Frame 0
    #             # Frame 25
    #             # Frame 50
    #             # Frame 75
    #             # dst.
    #             #
    #             # HANYA start kalau tidak ada YOLO
    #             # yang sedang berjalan.
    #             # ====================================================

    #             if (
    #                 frame_index % FRAME_INTERVAL == 0
    #                 and yolo_task is None
    #             ):

    #                 print(
    #                     f"Starting YOLO "
    #                     f"at frame {frame_index}"
    #                 )

    #                 yolo_task = asyncio.create_task(
    #                     asyncio.to_thread(
    #                         self.detect_frame,
    #                         frame.copy()
    #                     )
    #                 )

    #             # ====================================================
    #             # USE LAST YOLO RESULT
    #             # ====================================================

    #             annotation_start = time.perf_counter()

    #             annotated = frame.copy()

    #             objects = []

    #             if last_results is not None:

    #                 results = last_results

    #                 for box in results[0].boxes:

    #                     cls = int(
    #                         box.cls[0]
    #                     )

    #                     conf = float(
    #                         box.conf[0]
    #                     )

    #                     label = self.model.names[cls]

    #                     if label not in self.CLASS_MAPPING:
    #                         continue

    #                     mapped = self.CLASS_MAPPING[label]

    #                     objects.append({
    #                         "class": mapped,
    #                         "confidence": round(
    #                             conf,
    #                             2
    #                         )
    #                     })

    #                     x1, y1, x2, y2 = map(
    #                         int,
    #                         box.xyxy[0]
    #                     )

    #                     cv2.rectangle(
    #                         annotated,
    #                         (x1, y1),
    #                         (x2, y2),
    #                         (0, 255, 0),
    #                         2
    #                     )

    #                     cv2.putText(
    #                         annotated,
    #                         f"{mapped} {conf:.2f}",
    #                         (x1, y1 - 10),
    #                         cv2.FONT_HERSHEY_SIMPLEX,
    #                         0.6,
    #                         (0, 255, 0),
    #                         2
    #                     )

    #             annotation_time = (
    #                 time.perf_counter()
    #                 - annotation_start
    #             )

    #             # ====================================================
    #             # WRITE VIDEO
    #             # ====================================================

    #             writer.write(
    #                 annotated
    #             )

    #             # ====================================================
    #             # ENCODE
    #             # ====================================================

    #             encode_start = time.perf_counter()

    #             success, buffer = cv2.imencode(
    #                 ".jpg",
    #                 annotated
    #             )

    #             if not success:
    #                 raise Exception(
    #                     "Failed to encode frame"
    #                 )

    #             frame_base64 = base64.b64encode(
    #                 buffer
    #             ).decode()

    #             encode_time = (
    #                 time.perf_counter()
    #                 - encode_start
    #             )

    #             # ====================================================
    #             # PROGRESS
    #             # ====================================================

    #             progress = round(
    #                 (frame_index + 1)
    #                 * 100
    #                 / total_frames,
    #                 2
    #             )

    #             # ====================================================
    #             # WEBSOCKET
    #             # ====================================================

    #             ws_start = time.perf_counter()

    #             await manager.send(
    #                 job_id,
    #                 {
    #                     "frame": frame_base64,
    #                     "progress": progress,
    #                     "frame_number": frame_index,
    #                     "total_frame": total_frames,
    #                     "objects": objects
    #                 }
    #             )

    #             ws_time = (
    #                 time.perf_counter()
    #                 - ws_start
    #             )

    #             # ====================================================
    #             # FRAME PACING
    #             #
    #             # Contoh 25 FPS:
    #             #
    #             # Frame 0 -> 0.00
    #             # Frame 1 -> 0.04
    #             # Frame 2 -> 0.08
    #             # ...
    #             # ====================================================

    #             next_frame_time += frame_duration

    #             delay = (
    #                 next_frame_time
    #                 - time.perf_counter()
    #             )

    #             if delay > 0:

    #                 await asyncio.sleep(
    #                     delay
    #                 )

    #             else:

    #                 # Kalau processing lebih lambat
    #                 # daripada FPS video, jangan
    #                 # sleep negatif.
    #                 #
    #                 # Reset timing supaya tidak
    #                 # mengejar timestamp lama.

    #                 next_frame_time = (
    #                     time.perf_counter()
    #                     + frame_duration
    #                 )

    #             # ====================================================
    #             # DEBUG
    #             # ====================================================

    #             total_time = (
    #                 time.perf_counter()
    #                 - frame_start
    #             )

    #             yolo_status = (
    #                 "RUNNING"
    #                 if (
    #                     yolo_task is not None
    #                     and not yolo_task.done()
    #                 )
    #                 else "IDLE"
    #             )

    #             print(
    #                 f"[{time.strftime('%H:%M:%S')}] "
    #                 f"Frame {frame_index + 1}/{total_frames} | "
    #                 f"YOLO: {yolo_status} | "
    #                 f"Annotation: {annotation_time:.3f}s | "
    #                 f"Encode: {encode_time:.3f}s | "
    #                 f"WS: {ws_time:.3f}s | "
    #                 f"Total: {total_time:.3f}s | "
    #                 f"Sleep: {max(delay, 0):.3f}s"
    #             )

    #             frame_index += 1

    #     finally:

    #         # ========================================================
    #         # WAIT FOR YOLO
    #         #
    #         # Supaya thread YOLO terakhir tidak tertinggal
    #         # ketika video sudah selesai.
    #         # ========================================================

    #         if yolo_task is not None:

    #             try:

    #                 last_results = await yolo_task

    #                 print(
    #                     "Final YOLO task completed."
    #                 )

    #             except Exception as e:

    #                 print(
    #                     f"Final YOLO error: {e}"
    #                 )

    #         cap.release()

    #         writer.release()

    #         # ========================================================
    #         # FFMPEG
    #         # ========================================================

    #         command = [
    #             "ffmpeg",
    #             "-y",

    #             "-i",
    #             temp_video,

    #             "-i",
    #             input_video,

    #             "-map",
    #             "0:v:0",

    #             "-map",
    #             "1:a?",

    #             "-c:v",
    #             "libx264",

    #             "-preset",
    #             "medium",

    #             "-crf",
    #             "23",

    #             "-pix_fmt",
    #             "yuv420p",

    #             "-c:a",
    #             "aac",

    #             "-b:a",
    #             "128k",

    #             "-movflags",
    #             "+faststart",

    #             output_video
    #         ]

    #         print("=" * 80)
    #         print("Running FFmpeg...")
    #         print("Command:", " ".join(command))

    #         result = subprocess.run(
    #             command,
    #             stdout=subprocess.PIPE,
    #             stderr=subprocess.PIPE,
    #             text=True
    #         )

    #         print(result.stdout)
    #         print(result.stderr)

    #         if result.returncode != 0:

    #             raise Exception(
    #                 "FFmpeg convert failed."
    #             )

    #         if os.path.exists(
    #             temp_video
    #         ):

    #             os.remove(
    #                 temp_video
    #             )

    #     # ============================================================
    #     # FINISHED
    #     # ============================================================

    #     await manager.send(
    #         job_id,
    #         {
    #             "finished": True,
    #             "media_type": "VIDEO",
    #             "processing_type": "OBJECT_DETECTION",
    #             "temp_path": output_video,

    #             "preview_url": FileManager.get_preview_url(
    #                 output_video
    #             ),

    #             "processing_time": round(
    #                 time.time() - start,
    #                 2
    #             )
    #         }
    #     )

    
    async def detect_video_stream(
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
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        frame_index = 0

        width = int(
            cap.get(
                cv2.CAP_PROP_FRAME_WIDTH
            )
        )

        height = int(
            cap.get(
                cv2.CAP_PROP_FRAME_HEIGHT
            )
        )

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")

        temp_video = output_video.replace(
            ".mp4",
            "_temp.mp4"
        )

        writer = cv2.VideoWriter(

            temp_video,

            fourcc,

            fps,

            (
                width,
                height
            )

        )

        if not writer.isOpened():

            raise Exception(
                "Failed to create VideoWriter"
            )

        
        try:
            last_results = None
            last_frame_time = time.time()

            while True:

                ret, frame = cap.read()

                if not ret:
                    break

                frame_start = time.time()

                # =========================
                # YOLO
                # =========================
                ai_start = time.time()

                if (
                    frame_index % self.FRAME_INTERVAL == 0
                    or last_results is None
                ):
                    last_results = self.detect_frame(frame)

                # last_results = self.detect_frame(frame)

                ai_time = time.time() - ai_start

                results = last_results

                # =========================
                # Annotation
                # =========================
                annotation_start = time.time()

                annotated = frame.copy()

                objects = []

                for box in results[0].boxes:

                    cls = int(box.cls[0])
                    conf = float(box.conf[0])

                    label = self.model.names[cls]

                    if label not in self.CLASS_MAPPING:
                        continue

                    mapped = self.CLASS_MAPPING[label]

                    objects.append({
                        "class": mapped,
                        "confidence": round(conf, 2)
                    })

                    x1, y1, x2, y2 = map(
                        int,
                        box.xyxy[0]
                    )

                    cv2.rectangle(
                        annotated,
                        (x1, y1),
                        (x2, y2),
                        (0, 255, 0),
                        2
                    )

                    cv2.putText(
                        annotated,
                        f"{mapped} {conf:.2f}",
                        (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6,
                        (0, 255, 0),
                        2
                    )

                annotation_time = time.time() - annotation_start

                # =========================
                # JPEG Encode
                # =========================
                encode_start = time.time()

                _, buffer = cv2.imencode(
                    ".jpg",
                    annotated
                )

                frame_base64 = base64.b64encode(
                    buffer
                ).decode()

                encode_time = time.time() - encode_start

                # =========================
                # Progress
                # =========================
                progress = round(
                    (frame_index + 1) * 100 / total_frames,
                    2
                )

                # =========================
                # WebSocket
                # =========================
                ws_start = time.time()

                await manager.send(
                    job_id,
                    {
                        "frame": frame_base64,
                        "progress": progress,
                        "frame_number": frame_index,
                        "total_frame": total_frames,
                        "objects": objects,
                        "timestamp": datetime.now().strftime(
                            "%H:%M:%S.%f"
                        )[:-3]
                    }
                )

                ws_time = time.time() - ws_start

                # =========================
                # Timing
                # =========================
                total_time = time.time() - frame_start

                gap_time = time.time() - last_frame_time

                timestamp = datetime.now().strftime(
                    "%H:%M:%S.%f"
                )[:-3]

                print(
                    f"[{timestamp}] "
                    f"Frame {frame_index}/{total_frames} | "
                    f"Gap: {gap_time:.3f}s | "
                    f"AI: {ai_time:.3f}s | "
                    f"Annotation: {annotation_time:.3f}s | "
                    f"Encode: {encode_time:.3f}s | "
                    f"WS: {ws_time:.3f}s | "
                    f"Total: {total_time:.3f}s"
                )

                last_frame_time = time.time()

                frame_index += 1

                await asyncio.sleep(0)

        finally:
        
            cap.release()
            writer.release() 

            command = [

            "ffmpeg",

            "-y",

            "-i",
            temp_video,

            "-i",
            input_video,

            "-map",
            "0:v:0",

            "-map",
            "1:a?",

            "-c:v",
            "libx264",

            "-preset",
            "medium",

            "-crf",
            "23",

            "-pix_fmt",
            "yuv420p",

            "-c:a",
            "aac",

            "-b:a",
            "128k",

            "-movflags",
            "+faststart",

            output_video

        ]

        print("=" * 80)
        print("Running FFmpeg...")
        print("Command:", " ".join(command))

        result = subprocess.run(

            command,

            stdout=subprocess.PIPE,

            stderr=subprocess.PIPE,

            text=True

        )

        print(result.stdout)
        print(result.stderr)

        if result.returncode != 0:

            raise Exception(
                "FFmpeg convert failed."
            )

        if os.path.exists(
            temp_video
        ):

            os.remove(
                temp_video
            )
            
        await manager.send(

            job_id,

            {

                "finished": True,

                "media_type": "VIDEO",

                "processing_type": "OBJECT_DETECTION",

                "temp_path": output_video,

                "preview_url": FileManager.get_preview_url(
                    output_video
                ),

                "processing_time": round(
                    time.time() - start,
                    2
                )

            }

        )

    # def save_image(self, image, output_path):

    #     cv2.imwrite(output_path, image)

    def save_image(
        self,
        image,
        output_path
    ):

        success = cv2.imwrite(
            str(output_path),
            image
        )

        if not success:

            raise Exception(
                "Failed to save detection image."
            )

    def detect_image(self, image_path):

        image = self.read_image(image_path)

        results = self.detect_frame(image)

        annotated = image.copy()

        objects = []

        for box in results[0].boxes:

            cls = int(box.cls[0])
            conf = float(box.conf[0])

            label = self.model.names[cls]

            if label not in self.CLASS_MAPPING:
                continue

            mapped_label = self.CLASS_MAPPING[label]

            objects.append({
                "class": mapped_label,
                "confidence": round(conf, 2)
            })

            x1, y1, x2, y2 = map(int, box.xyxy[0])

            cv2.rectangle(
                annotated,
                (x1, y1),
                (x2, y2),
                (0, 255, 0),
                2
            )

            cv2.putText(
                annotated,
                f"{mapped_label} {conf:.2f}",
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2
            )

        unique_objects = {}

        for obj in objects:
            cls = obj["class"]

            if cls not in unique_objects:
                unique_objects[cls] = obj

        objects = list(unique_objects.values())

        output_path = FileManager.build_temp_file_path(
            "detection",
            image_path
        )

        self.save_image(
            annotated,
            output_path
        )

        return str(output_path), objects