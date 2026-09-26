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
from utils.live_capture import (
    LIVE_OPEN_TIMEOUT_MS,
    LIVE_POLL_INTERVAL,
    LIVE_READ_TIMEOUT_MS,
    LIVE_SOURCE_LOST_SECONDS,
    LatestFrameReader,
    open_failed_message,
    resolution_rejected_message,
)
from utils.pacing import FramePacer
from utils.video_preview import MAX_VIDEO_WIDTH, MAX_VIDEO_HEIGHT
from utils.websocket_manager import manager, send_live

BASE_DIR = Path(__file__).resolve().parent.parent

WEIGHTS_DIR = BASE_DIR / "weights"

YOLO_WEIGHT = WEIGHTS_DIR / "yolo11x.pt"

class ObjectDetector:

    # Siklus deteksi baru boleh mulai tiap FRAME_INTERVAL frame (kalau
    # siklus sebelumnya sudah selesai — lihat pengecekan yolo_task di
    # detect_video_stream/detect_live_stream).
    #
    # Sebelumnya 25 (~1x/detik di video 30fps). Diukur langsung: pada video
    # drone 4K, detect_frame() atas frame 4K MENTAH makan ~88ms/panggilan
    # + frame.copy() ~9ms — bukan GPU (RTX 5070 Ti) yang jadi batasnya (GPU
    # kebanyakan nganggur nunggu, makanya kepakainya cuma ~16%), tapi
    # preprocessing CPU letterbox 4K->1280 di dalam pipeline ultralytics.
    # Setelah frame di-resize dulu ke lebar imgsz (1280) sebelum dilempar
    # ke detect_frame (lihat detect_video_stream), satu siklus turun jadi
    # ~61ms (resize ~5ms + detect ~56ms) — muat jauh lebih rapat tanpa
    # mengganggu pacing video. 3 (~10x/detik di 30fps) sudah diuji end-to-
    # end pakai server+klien WebSocket sungguhan: pengiriman tetap ~1.09x
    # dari real-time (nyaris sama dengan FRAME_INTERVAL=25 yang ~1.0x),
    # dengan GPU terpakai jauh lebih sering dan kotak deteksi jauh lebih
    # sering diperbarui. Turunkan lagi hanya kalau sudah diuji ulang dengan
    # cara yang sama — di bawah ini terbukti CEPAT memburuk (FRAME_INTERVAL
    # =1 sempat bikin seluruh pipeline 2.3x lebih lambat dari real-time).
    FRAME_INTERVAL = 3
    CONFIDENCE_THRESHOLD = 0.60

    # ------------------------------------------------------------------
    # Umpan langsung ke browser (WebSocket)
    #
    # Semua ini HANYA memengaruhi gambar yang dikirim ke browser — video
    # keluaran yang ditulis ke disk tetap resolusi & fps aslinya.
    #
    # STREAM_FPS berperan sebagai BATAS ATAS, bukan target kaku: jumlah
    # frame yang dilewati dihitung dari fps video sumber (lihat send_every
    # di detect_video_stream), jadi sumber 25fps tetap dikirim utuh
    # sementara sumber 60fps dikirim separuhnya.
    # ------------------------------------------------------------------
    STREAM_MAX_WIDTH = 960
    STREAM_JPEG_QUALITY = 70
    STREAM_FPS = 30

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

    def _annotate_frame(self, frame, results, in_place=False, scale=1.0):
        """Frame yang digambari kotak deteksi, beserta daftar objeknya.
        `results` boleh None (inferensi pertama belum selesai) — frame
        dikembalikan tanpa kotak.

        `in_place=True` melewati `frame.copy()` (untuk frame 4K, copy
        penuh ini sendiri makan beberapa ms) dan menggambar langsung di
        buffer `frame`. Hanya aman kalau pemanggil yakin tidak ada pihak
        lain yang masih memegang/membaca buffer itu — detect_video_stream
        memenuhi ini karena `cap.read()` selalu mengembalikan buffer baru
        dan salinan terpisah sudah dibuat untuk task YOLO. detect_live_stream
        tetap pakai default (copy) karena frame berasal dari buffer bersama
        LatestFrameReader.

        `scale` mengoreksi koordinat box kalau `results` dihitung dari
        frame yang sudah di-resize lebih kecil dari `frame` (lihat
        detect_video_stream, yang me-resize ke lebar imgsz sebelum
        dilempar ke YOLO supaya lebih ringan) — tanpa ini kotak akan
        digambar memakai koordinat piksel gambar kecil itu langsung di
        atas frame resolusi penuh, jadi mengumpul salah tempat (keliatan
        menciut ke pojok kiri-atas)."""

        annotated = frame if in_place else frame.copy()

        objects = []

        if results is None:
            return annotated, objects

        for box in results[0].boxes:

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

            if scale != 1.0:
                x1 = int(x1 * scale)
                y1 = int(y1 * scale)
                x2 = int(x2 * scale)
                y2 = int(y2 * scale)

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

        return annotated, objects

    def _encode_stream_frame(self, annotated):
        """JPEG base64 untuk umpan browser, diperkecil ke STREAM_MAX_WIDTH.
        None kalau encode gagal."""

        height, width = annotated.shape[:2]

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

        if not success:
            return None

        return base64.b64encode(buffer).decode()

    async def _encode_and_send(self, job_id, annotated, meta):
        """Encode JPEG di thread terpisah lalu kirim ke WebSocket — dipakai
        dari detect_video_stream secara fire-and-forget (lihat komentar di
        sana) supaya encode tidak menahan jalur kritis pacing frame."""

        frame_base64 = await asyncio.to_thread(
            self._encode_stream_frame,
            annotated
        )

        if frame_base64 is None:
            return

        await manager.send(
            job_id,
            {
                "frame": frame_base64,
                "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3],
                **meta
            }
        )

    async def _encode_and_send_live(self, job_id, annotated, meta, stop_event):
        """Sama seperti _encode_and_send, versi detect_live_stream: pakai
        send_live (bukan manager.send langsung) supaya socket yang putus
        di tengah sesi live tetap men-set stop_event, bukan cuma mencetak
        error — loop utama membaca stop_event itu tiap iterasi (while not
        stop_event.is_set()) jadi otomatis berhenti pada giliran
        berikutnya tanpa perlu nilai balik dicek secara sinkron di jalur
        kritis."""

        frame_base64 = await asyncio.to_thread(
            self._encode_stream_frame,
            annotated
        )

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
        output_video,
        stop_event: asyncio.Event | None = None
    ):

        start = time.time()

        # Backend MSMF (Media Foundation Windows) lewat decode hardware
        # memangkas cap.read() dari ~20-30ms jadi ~11ms/frame utk MP4 4K
        # dibanding FFmpeg (software) — tapi ini TERBUKTI hanya berlaku
        # utk MP4. Diukur langsung pada berkas .ts (MPEG-TS) dari kamera:
        # MSMF bukan cuma lebih lambat (~55ms/frame, 27x lebih lambat dari
        # FFmpeg ~2ms/frame), tapi juga BERHENTI MEMBACA DI TENGAH JALAN
        # (gagal lewat frame ~98 dari total ~2969) tanpa error — video jadi
        # keliatan terpotong/nge-gap ganjil. FFmpeg-lah yang justru "rumah"
        # buat MPEG-TS. Makanya MSMF hanya dipakai utk .mp4 (kontainer yang
        # sudah diuji cocok dengannya); ekstensi lain pakai FFmpeg.
        suffix = Path(str(input_video)).suffix.lower()

        cap = None

        if suffix == ".mp4":
            cap = cv2.VideoCapture(str(input_video), cv2.CAP_MSMF)

            if not cap.isOpened():
                cap = None

        if cap is None:
            cap = cv2.VideoCapture(str(input_video), cv2.CAP_FFMPEG)

        if not cap.isOpened():
            raise Exception("Cannot open video")

        fps = cap.get(cv2.CAP_PROP_FPS)

        # Sebagian berkas melaporkan fps 0/NaN — tanpa penjaga ini
        # frame_duration di bawah akan meledak (division by zero).
        if not fps or fps <= 0:
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

        # Backend default OpenCV (FFmpeg software) encode mp4v pada 4K
        # terukur ~78ms/frame — sendirian sudah >2x anggaran 1 frame di
        # 30fps. MSMF pakai encoder hardware Windows dan turun jadi
        # ~3-4ms/frame. Ini penyebab utama umpan terlihat slow-motion
        # untuk video drone resolusi tinggi. Fallback ke default kalau
        # MSMF gagal dibuka.
        writer = cv2.VideoWriter(

            temp_video,

            cv2.CAP_MSMF,

            fourcc,

            fps,

            (
                width,
                height
            )

        )

        if not writer.isOpened():

            writer = cv2.VideoWriter(
                temp_video,
                fourcc,
                fps,
                (width, height)
            )

        if not writer.isOpened():

            raise Exception(
                "Failed to create VideoWriter"
            )

        
        # Kirim tiap send_every frame supaya laju tampilan mendekati
        # STREAM_FPS tanpa melebihi fps sumber. Sengaja berbasis nomor
        # frame, bukan jam dinding: pacing di bawah menahan loop ke 1/fps
        # per frame, jadi pengiriman berbasis jam dinding pun tetap hanya
        # bisa jatuh di kelipatan frame.
        send_every = max(1, round(fps / self.STREAM_FPS))

        # Pacing: tanpa ini loop berjalan secepat hardware mampu sehingga
        # video terlihat dipercepat. Frame dijadwalkan mengikuti durasi
        # asli video. FramePacer juga menaikkan resolusi timer Windows
        # selama sesi — tanpa itu tiap sleep kebablasan sampai +15 ms dan
        # video justru jadi slow motion. Lihat utils/pacing.py.
        pacer = FramePacer(fps)
        pacer.start()

        print(
            f"[detect] mulai | {width}x{height} @ {fps:.2f}fps | "
            f"{total_frames} frame | kirim tiap {send_every} frame | "
            f"anggaran {1000 / fps:.1f}ms/frame"
        )

        try:
            last_results = None

            # Faktor skala frame penuh / frame yang dipakai utk last_results
            # (lihat _annotate_frame) — dipasangkan dengan last_results tiap
            # kali dipanen dari yolo_task, bukan dihitung ulang dari frame
            # sekarang, supaya tetap cocok dengan resolusi yang benar-benar
            # dipakai saat siklus deteksi itu dimulai.
            last_scale = 1.0

            # Task YOLO yang sedang berjalan di background thread — supaya
            # inferensi tidak lagi menahan event loop seperti versi sinkron.
            yolo_task = None

            # Skala yang berlaku utk yolo_task yang sedang/baru saja
            # berjalan — dipindahkan ke last_scale begitu hasilnya dipanen.
            yolo_scale = 1.0

            # Task encode+kirim yang sedang berjalan di background — pola
            # sama seperti yolo_task. JPEG encode (~8-9ms untuk frame 4K)
            # tadinya dikerjakan sinkron di jalur kritis tiap send_every
            # frame, jadi ikut menahan pacing tiap kali dipanggil. Dengan
            # ini, frame berikutnya boleh langsung dibaca & ditulis sementara
            # encode+kirim frame sebelumnya masih berjalan.
            send_task = None

            last_frame_time = time.time()

            while True:

                # Klien menekan Hentikan (atau socket-nya putus — lihat
                # listen_for_stop di websocket_manager.py, dipicu keduanya).
                # Sebelumnya tidak ada pengecekan ini sama sekali: menutup
                # socket dari sisi klien tidak pernah sampai ke loop ini,
                # jadi backend tetap memproses SISA SELURUH video (baca,
                # deteksi, tulis, lalu ffmpeg) walau tidak ada yang
                # menunggu hasilnya lagi — baru berhenti sendiri begitu
                # video habis. Dicek di awal tiap iterasi supaya berhenti
                # dalam waktu satu frame, bukan menunggu EOF.
                if stop_event is not None and stop_event.is_set():
                    break

                # to_thread di sini (bukan cap.read() langsung) supaya event
                # loop sempat dijadwalkan ulang di antara tiap frame — tanpa
                # ini, seluruh pipeline (read+annotate+write) jalan sebagai
                # kode sinkron di thread event loop yang sama, dan satu-
                # satunya titik "await" per iterasi cuma pacer.wait() di
                # akhir. Task kirim WebSocket di background (send_task) jadi
                # baru sempat lanjut jalan di jendela sempit itu saja,
                # menyebabkan pengiriman ke browser jadi tersendat/tidak
                # merata (~50-80% frame malah tidak terkirim, terukur lewat
                # klien WebSocket sungguhan — lihat catatan di _encode_and_send).
                ret, frame = await asyncio.to_thread(cap.read)

                if not ret:
                    break

                frame_start = time.time()

                # =========================
                # YOLO
                # =========================
                ai_start = time.time()

                # Ambil hasil inferensi sebelumnya begitu threadnya selesai.
                if yolo_task is not None and yolo_task.done():

                    try:
                        last_results = yolo_task.result()
                        last_scale = yolo_scale
                    except Exception:
                        print(
                            f"[detect] YOLO error at frame {frame_index}:\n"
                            f"{traceback.format_exc()}"
                        )
                    finally:
                        yolo_task = None

                # Mulai inferensi baru hanya kalau tidak ada yang berjalan.
                if (
                    frame_index % self.FRAME_INTERVAL == 0
                    and yolo_task is None
                ):
                    # Pre-resize ke lebar imgsz (1280) sebelum masuk YOLO.
                    # Diukur langsung: detect_frame(frame 4K mentah) makan
                    # ~88ms + frame.copy() ~9ms = ~97ms/siklus — bukan GPU-
                    # nya yang jadi batas (GPU cuma numpang idle nunggu),
                    # tapi preprocessing CPU letterbox 4K->1280 di dalam
                    # pipeline ultralytics. cv2.resize eksplisit di sini
                    # cuma ~5ms (dan sekalian jadi salinan aman utk thread
                    # background, jadi frame.copy() terpisah tidak perlu
                    # lagi) dan detect_frame atas gambar yang sudah 1280
                    # turun jadi ~56ms — total ~61ms, hasil deteksi sama
                    # (model tetap infer di imgsz=1280) tapi GPU dapat
                    # giliran lebih sering tanpa membebani CPU/loop utama.
                    detect_input = frame

                    frame_w = frame.shape[1]

                    yolo_scale = 1.0

                    if frame_w > 1280:
                        detect_input = cv2.resize(
                            frame,
                            (1280, int(frame.shape[0] * 1280 / frame_w)),
                            interpolation=cv2.INTER_LINEAR
                        )

                        # Box dari YOLO nanti dalam koordinat gambar 1280
                        # ini — dikalikan balik ke skala frame asli waktu
                        # dipanen (lihat last_scale di atas).
                        yolo_scale = frame_w / detect_input.shape[1]

                    yolo_task = asyncio.create_task(
                        asyncio.to_thread(
                            self.detect_frame,
                            detect_input
                        )
                    )

                ai_time = time.time() - ai_start

                # =========================
                # Annotation
                # =========================
                annotation_start = time.time()

                # Beberapa frame pertama belum punya hasil karena inferensi
                # kini berjalan asinkron — frame tetap ditampilkan, hanya
                # belum berkotak. in_place=True: frame dari cap.read() ini
                # tidak dipakai lagi setelah baris ini, dan task YOLO (kalau
                # ada) sudah jalan di atas salinannya sendiri — jadi salinan
                # frame.copy() di _annotate_frame (~5-9ms untuk frame 4K)
                # bisa dilewati.
                annotated, objects = self._annotate_frame(
                    frame,
                    last_results,
                    in_place=True,
                    scale=last_scale
                )

                annotation_time = time.time() - annotation_start


                # =========================
                # WRITE VIDEO
                # =========================
                # Sama alasannya dengan cap.read() di atas: lewat to_thread
                # supaya event loop tidak diblok, memberi giliran ke task
                # kirim WebSocket yang berjalan di background.
                await asyncio.to_thread(writer.write, annotated)


                # =========================
                # JPEG Encode + WebSocket (throttled, di background)
                #
                # Hanya dikerjakan tiap send_every frame, dan gambarnya
                # diperkecil + dikompres. Encode+kirim dilempar ke
                # asyncio.to_thread lewat _encode_and_send dan TIDAK
                # ditunggu (fire-and-forget) supaya frame berikutnya bisa
                # langsung diproses — encode JPEG frame 4K sendirian
                # ~8-9ms, kalau menahan jalur kritis tiap frame itu cukup
                # untuk bikin loop telat dari anggaran 33ms/frame.
                #
                # Giliran baru hanya dibuat kalau giliran sebelumnya sudah
                # selesai (pola sama seperti yolo_task) — menjamin urutan
                # pesan ke browser tanpa perlu queue eksplisit. Kalau
                # giliran sebelumnya belum selesai, frame ini dilewati
                # utk browser (video output tetap dapat frame ini lewat
                # writer.write di atas).
                # =========================
                encode_time = 0.0
                ws_time = 0.0

                is_last_frame = frame_index == total_frames - 1

                if frame_index % send_every == 0 or is_last_frame:

                    meta = {
                        "progress": round(
                            (frame_index + 1) * 100 / total_frames,
                            2
                        ),
                        "frame_number": frame_index,
                        "total_frame": total_frames,
                        "objects": objects,
                    }

                    if is_last_frame:

                        # Frame terakhir wajib benar-benar terkirim (ini
                        # hasil final) — tunggu giliran sebelumnya kelar
                        # dulu baru kirim yang ini secara langsung supaya
                        # tidak ada frame lama menyusul setelahnya.
                        if send_task is not None:
                            try:
                                await send_task
                            except Exception:
                                print(
                                    f"[detect] Encode/WS error at frame "
                                    f"{frame_index}:\n"
                                    f"{traceback.format_exc()}"
                                )

                        send_task = None

                        await self._encode_and_send(job_id, annotated, meta)

                    elif send_task is None or send_task.done():

                        if send_task is not None:
                            try:
                                send_task.result()
                            except Exception:
                                print(
                                    f"[detect] Encode/WS error at frame "
                                    f"{frame_index}:\n"
                                    f"{traceback.format_exc()}"
                                )

                        send_task = asyncio.create_task(
                            self._encode_and_send(job_id, annotated, meta)
                        )

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

                # =========================
                # PACING
                #
                # Menjaga pemutaran mengikuti durasi asli video. Frame yang
                # sempat telat dikejar oleh frame berikutnya (dibatasi
                # MAX_LAG_FRAMES), bukan dijadikan drift permanen.
                # =========================
                await pacer.wait()

        finally:

            pacer.stop()

            print(f"[detect] {pacer.report()}")

            # Tunggu inferensi terakhir supaya threadnya tidak tertinggal
            # setelah video selesai.
            if yolo_task is not None:
                try:
                    last_results = await yolo_task
                except Exception:
                    print(
                        "[detect] Final YOLO error:\n"
                        f"{traceback.format_exc()}"
                    )

            # Tunggu giliran encode+kirim terakhir juga (mis. kalau loop
            # berhenti lebih awal lewat break sebelum frame terakhir sempat
            # menunggunya secara eksplisit).
            if send_task is not None:
                try:
                    await send_task
                except Exception:
                    print(
                        "[detect] Final encode/WS error:\n"
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

            # Kalau sesi dihentikan lebih awal (stop_event), temp_video
            # cuma berisi sebagian frame sementara audio dipetakan dari
            # input_video yang panjangnya utuh — tanpa -shortest, hasil
            # akhirnya bisa punya audio yang jauh lebih panjang dari
            # videonya.
            "-shortest",

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
            
        # Kalau sesi dihentikan lewat tombol Hentikan, klien biasanya sudah
        # menutup socket-nya sebelum baris ini sempat jalan — mengirim ke
        # socket yang sudah putus melempar exception (dulu tidak ditangkap
        # di sini sama sekali, jadi nongol sebagai error walau prosesnya
        # sebenarnya sudah "selesai" secara normal setelah stop_event).
        # Socket putus itu bukan kegagalan, jadi cukup dicatat, bukan
        # dilempar ulang.
        try:
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
        except Exception:
            print(
                "[detect] Gagal mengirim pesan finished (klien mungkin "
                "sudah putus):\n"
                f"{traceback.format_exc()}"
            )

    async def detect_live_stream(
        self,
        job_id: str,
        network_url: str,
        stop_event: asyncio.Event
    ):
        """Deteksi objek pada stream UDP. Beda dari detect_video_stream:

        - tidak ada VideoWriter/FFmpeg — hasil sesi live hanya ditampilkan,
          tidak ditulis ke disk, jadi pesan `finished` tidak membawa
          temp_path/preview_url;
        - tidak ada FramePacer — sumber sudah realtime; frame diambil dari
          LatestFrameReader yang otomatis melompati frame tertunggak;
        - laju kirim dibatasi STREAM_FPS lewat jam dinding, karena stream
          tidak punya fps berkas yang bisa dijadikan patokan send_every;
        - sesi berakhir karena klien mengirim stop, socket putus, atau
          sumber diam selama LIVE_SOURCE_LOST_SECONDS.
        """

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

            # Sama seperti batas resolusi unggahan berkas (lihat
            # utils/video_preview.py) — sumber live di atas Full HD juga
            # ditolak, bukan cuma peringatan. Baru bisa dicek SETELAH
            # stream terbuka (beda dari unggahan berkas yang resolusinya
            # sudah diketahui sebelum sesi dimulai).
            if (
                reader.width > MAX_VIDEO_WIDTH
                or reader.height > MAX_VIDEO_HEIGHT
            ):

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
                f"[detect-live] tersambung ke {network_url} "
                f"({reader.width}x{reader.height} "
                f"@ {reader.fps:.2f}fps dilaporkan sumber)"
            )

            # Frame yang datang lebih rapat dari ini dilewati seluruhnya.
            # Toleransi 25% supaya sumber 30 fps dengan jitter jaringan tidak
            # terpotong jadi separuh lajunya; sumber 60 fps tetap tertahan
            # ke ±30 fps.
            min_frame_gap = 0.75 / self.STREAM_FPS

            last_results = None
            last_scale = 1.0
            yolo_task = None
            yolo_scale = 1.0

            # Sama seperti detect_video_stream: encode+kirim dilempar ke
            # background (lihat _encode_and_send_live) supaya tidak
            # menahan loop pembacaan frame terbaru dari reader.
            send_task = None

            last_seq = 0
            last_processed_at = 0.0
            frame_index = 0
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

                    now = time.time()

                    if now - last_processed_at < min_frame_gap:
                        await asyncio.sleep(0)
                        continue

                    last_processed_at = now

                    # Pola inferensi sama dengan detect_video_stream: hasil
                    # YOLO dipanen begitu threadnya selesai, inferensi baru
                    # hanya dimulai tiap FRAME_INTERVAL frame yang diproses
                    # dan kalau tidak ada yang sedang berjalan.
                    if yolo_task is not None and yolo_task.done():

                        try:
                            last_results = yolo_task.result()
                            last_scale = yolo_scale
                        except Exception:
                            print(
                                f"[detect-live] YOLO error at frame {frame_index}:\n"
                                f"{traceback.format_exc()}"
                            )
                        finally:
                            yolo_task = None

                    if (
                        frame_index % self.FRAME_INTERVAL == 0
                        and yolo_task is None
                    ):
                        # Sama seperti detect_video_stream: resize ke lebar
                        # imgsz (1280) sebelum masuk YOLO memangkas beban
                        # CPU preprocessing utk sumber beresolusi tinggi —
                        # lihat catatan lengkap di sana. yolo_scale dipakai
                        # _annotate_frame utk mengalikan balik koordinat
                        # box ke resolusi frame asli.
                        detect_input = frame

                        frame_w = frame.shape[1]

                        yolo_scale = 1.0

                        if frame_w > 1280:
                            detect_input = cv2.resize(
                                frame,
                                (1280, int(frame.shape[0] * 1280 / frame_w)),
                                interpolation=cv2.INTER_LINEAR
                            )

                            yolo_scale = frame_w / detect_input.shape[1]

                        yolo_task = asyncio.create_task(
                            asyncio.to_thread(
                                self.detect_frame,
                                detect_input
                            )
                        )

                    # in_place=True aman di sini: frame dari reader.latest()
                    # tidak pernah ditimpa reader thread (cap.read()
                    # mengalokasikan array baru tiap panggilan — lihat
                    # docstring LatestFrameReader.latest()), dan task YOLO
                    # (kalau ada) sudah jalan di atas salinan/resize-nya
                    # sendiri, bukan `frame` ini.
                    annotated, objects = self._annotate_frame(
                        frame,
                        last_results,
                        in_place=True,
                        scale=last_scale
                    )

                    meta = {
                        "objects": objects,
                        "live": True,
                        "progress": None,
                        "frame_number": frame_index,
                        "total_frame": None,
                        "elapsed_seconds": round(time.time() - start, 1),
                    }

                    # Sama seperti detect_video_stream: encode JPEG +
                    # kirim dilempar ke background (giliran baru cuma
                    # dibuat kalau yang sebelumnya sudah selesai) supaya
                    # tidak menahan loop pembacaan frame terbaru.
                    if send_task is None or send_task.done():

                        if send_task is not None:
                            try:
                                send_task.result()
                            except Exception:
                                print(
                                    f"[detect-live] Encode/WS error at "
                                    f"frame {frame_index}:\n"
                                    f"{traceback.format_exc()}"
                                )

                        send_task = asyncio.create_task(
                            self._encode_and_send_live(
                                job_id, annotated, meta, stop_event
                            )
                        )

                    frame_index += 1

                    # Kalau frame baru selalu sudah menunggu, loop tidak
                    # pernah masuk sleep di atas — serahkan kendali supaya
                    # task YOLO & listener stop tetap dijadwalkan.
                    await asyncio.sleep(0)

            finally:

                if yolo_task is not None:
                    try:
                        await yolo_task
                    except Exception:
                        print(
                            "[detect-live] Final YOLO error:\n"
                            f"{traceback.format_exc()}"
                        )

                if send_task is not None:
                    try:
                        await send_task
                    except Exception:
                        print(
                            "[detect-live] Final encode/WS error:\n"
                            f"{traceback.format_exc()}"
                        )

            print(
                f"[detect-live] selesai ({end_reason}) | "
                f"{frame_index} frame dalam {time.time() - start:.1f}s"
            )

            await send_live(
                job_id,
                {
                    "finished": True,
                    "live": True,
                    "reason": end_reason,
                    "media_type": "VIDEO",
                    "processing_type": "OBJECT_DETECTION",
                    "processing_time": round(time.time() - start, 2),
                    "total_frames": frame_index
                },
                stop_event
            )

        finally:

            # Ringkasan sudah terkirim di atas; menunggu thread pembaca
            # (paling lama ~READ_TIMEOUT kalau sumber sedang diam) tidak
            # lagi menahan klien.
            reader.stop()

            await asyncio.to_thread(reader.join)

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