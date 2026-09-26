from ultralytics import YOLO
import cv2
import base64
import asyncio
import traceback
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
    CONFIDENCE_THRESHOLD = 0.70

    # Ukuran & kualitas JPEG khusus untuk umpan langsung ke browser — tidak
    # memengaruhi resolusi video keluaran yang ditulis ke disk. Mengirim
    # frame resolusi penuh lewat WebSocket di setiap frame video adalah
    # penyebab utama beban berlebih (lihat catatan di detect_video_stream).
    STREAM_MAX_WIDTH = 960
    STREAM_JPEG_QUALITY = 70

    # Target laju gambar umpan langsung ke browser. Nilai ini SEMATA
    # menentukan kemulusan tampilan; kecepatan pemutaran (slow-motion atau
    # tidak) ditentukan oleh throughput pemrosesan, bukan oleh nilai ini.
    # Terlalu rendah -> tampilan patah-patah seperti slideshow; terlalu
    # tinggi -> biaya encode/kirim naik dan pemrosesan bisa jatuh di bawah
    # waktu nyata lagi.
    STREAM_FPS = 15

    CLASS_MAPPING = {
        "person": "person",

        "car": "vehicle",
        "motorcycle": "vehicle",
    }

    CLASS_COLORS = {
        "person": {
            "bgr": (0, 255, 0),
            "hex": "#00FF00"
        },

        "vehicle": {
            "bgr": (255, 0, 0),
            "hex": "#0000FF"
        }
    }

    def get_class_color(self, mapped_class):
    
        return self.CLASS_COLORS.get(
            mapped_class,
            {
                "bgr": (255, 255, 255),
                "hex": "#FFFFFF"
            }
        )

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
            conf=self.CONFIDENCE_THRESHOLD,
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

        if fps <= 0:
            fps = 25.0

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

        last_results = None

        # Task YOLO yang sedang berjalan di background thread — supaya
        # inferensi tidak memblokir loop baca/tulis frame (dulu YOLO
        # dipanggil sinkron di sini, menahan event loop selama inferensi).
        yolo_task = None

        # Kirim tiap send_every frame supaya laju tampilan mendekati
        # STREAM_FPS. Sengaja berbasis nomor frame, bukan jam dinding:
        # pacing di bawah menahan loop ke 1/fps per frame, jadi pengiriman
        # berbasis jam dinding pun tetap hanya bisa jatuh di kelipatan
        # frame — lebih jujur dinyatakan langsung sebagai "tiap N frame".
        # Konsekuensinya laju tampilan terkuantisasi: fps, fps/2, fps/3, …
        send_every = max(1, round(fps / self.STREAM_FPS))

        # Pacing: tanpa ini loop berjalan secepat hardware mampu sehingga
        # video terlihat dipercepat. Frame dijadwalkan mengikuti durasi
        # asli video.
        frame_duration = 1.0 / fps
        next_frame_time = time.perf_counter()

        # Instrumentasi: biaya tiap tahap diakumulasi lalu dicetak berkala
        # (bukan per frame) supaya logging sendiri tidak ikut memperlambat.
        stat_window = max(1, int(fps))
        stat = {"read": 0.0, "annotate": 0.0, "write": 0.0, "stream": 0.0}
        stat_wall = time.perf_counter()

        print(
            f"[detect] mulai | {width}x{height} @ {fps:.1f}fps | "
            f"{total_frames} frame | kirim tiap {send_every} frame | "
            f"anggaran {1000 / fps:.1f}ms/frame"
        )

        try:

            while True:

                stage = time.perf_counter()

                ret, frame = cap.read()

                if not ret:
                    break

                stat["read"] += time.perf_counter() - stage

                if yolo_task is not None and yolo_task.done():

                    try:
                        last_results = yolo_task.result()
                    except Exception:
                        print(
                            f"[detect] YOLO error at frame {frame_index}:\n"
                            f"{traceback.format_exc()}"
                        )
                    finally:
                        yolo_task = None

                if (
                    frame_index % self.FRAME_INTERVAL == 0
                    and yolo_task is None
                ):
                    yolo_task = asyncio.create_task(
                        asyncio.to_thread(
                            self.detect_frame,
                            frame.copy()
                        )
                    )

                stage = time.perf_counter()

                annotated = frame.copy()

                objects = []

                if last_results is not None:

                    for box in last_results[0].boxes:

                        cls = int(box.cls[0])
                        conf = float(box.conf[0])

                        label = self.model.names[cls]

                        if label not in self.CLASS_MAPPING:
                            continue

                        mapped = self.CLASS_MAPPING[label]

                        color = self.get_class_color(mapped)

                        objects.append({
                            "class": mapped,
                            "confidence": round(conf, 2),
                            "color": color["hex"]
                        })

                        x1, y1, x2, y2 = map(
                            int,
                            box.xyxy[0]
                        )

                        cv2.rectangle(
                            annotated,
                            (x1, y1),
                            (x2, y2),
                            color["bgr"],
                            2
                        )

                        cv2.putText(
                            annotated,
                            f"{mapped} {conf:.2f}",
                            (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.6,
                            color["bgr"],
                            2
                        )

                stat["annotate"] += time.perf_counter() - stage

                # =========================
                # WRITE VIDEO
                # =========================
                stage = time.perf_counter()

                writer.write(annotated)

                stat["write"] += time.perf_counter() - stage

                # =========================
                # WEBSOCKET (throttled)
                # =========================
                is_last_frame = frame_index == total_frames - 1

                if frame_index % send_every == 0 or is_last_frame:

                    stage = time.perf_counter()

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

                        frame_base64 = base64.b64encode(
                            buffer
                        ).decode()

                        progress = round(
                            (frame_index + 1) * 100 / total_frames,
                            2
                        )

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

                    stat["stream"] += time.perf_counter() - stage

                frame_index += 1

                # =========================
                # LAPORAN BERKALA
                # =========================
                if frame_index % stat_window == 0:

                    elapsed = time.perf_counter() - stat_wall

                    print(
                        f"[detect] {frame_index}/{total_frames} | "
                        f"read {stat['read'] / stat_window * 1000:5.1f}ms "
                        f"annotate {stat['annotate'] / stat_window * 1000:5.1f}ms "
                        f"write {stat['write'] / stat_window * 1000:5.1f}ms "
                        f"stream {stat['stream'] / stat_window * 1000:5.1f}ms "
                        f"| total {sum(stat.values()) / stat_window * 1000:5.1f}ms "
                        f"/ anggaran {1000 / fps:.1f}ms "
                        f"| tercapai {stat_window / elapsed:4.1f}fps "
                        f"(sumber {fps:.0f}fps)"
                    )

                    stat = {
                        "read": 0.0,
                        "annotate": 0.0,
                        "write": 0.0,
                        "stream": 0.0
                    }

                    stat_wall = time.perf_counter()

                # =========================
                # PACING
                # =========================
                next_frame_time += frame_duration

                delay = next_frame_time - time.perf_counter()

                if delay > 0:
                    await asyncio.sleep(delay)
                else:
                    # Pemrosesan tertinggal dari waktu nyata — reset jadwal
                    # supaya tidak "mengejar" dengan lompatan cepat, lalu
                    # tetap kembalikan kendali ke event loop supaya task
                    # YOLO di background sempat maju.
                    next_frame_time = time.perf_counter() + frame_duration
                    await asyncio.sleep(0)

        finally:

            if yolo_task is not None:
                try:
                    last_results = await yolo_task
                except Exception:
                    print(
                        "[detect] Final YOLO error:\n"
                        f"{traceback.format_exc()}"
                    )

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

            color = self.get_class_color(mapped_label)

            objects.append({
                "class": mapped_label,
                "confidence": round(conf, 2),
                "color": color["hex"]
            })

            x1, y1, x2, y2 = map(int, box.xyxy[0])

            cv2.rectangle(
                annotated,
                (x1, y1),
                (x2, y2),
                color["bgr"],
                2
            )

            cv2.putText(
                annotated,
                f"{mapped_label} {conf:.2f}",
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                color["bgr"],
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