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
from utils.live_capture import LatestFrameReader
from utils.pacing import FramePacer
from utils.websocket_manager import manager


class VideoCrowdCounterLive:

    FRAME_INTERVAL = 10

    # ------------------------------------------------------------------
    # Sumber live (UDP)
    #
    # OPEN_TIMEOUT: batas tunggu paket pertama saat sesi dibuka.
    # READ_TIMEOUT: batas satu cap.read() memblokir di thread pembaca.
    # SOURCE_LOST: sesi diakhiri otomatis kalau tidak ada frame baru selama
    #   ini — sengaja lebih longgar dari READ_TIMEOUT supaya jeda sesaat di
    #   jaringan tidak langsung memutus sesi. Terukur, sesi berakhir ±15 s
    #   setelah pengirim mati, bukan 10 s: begitu READ_TIMEOUT terpicu,
    #   FFmpeg masih mengeluarkan sisa frame di decoder, dan frame itu
    #   mereset hitungan.
    # POLL_INTERVAL: jeda cek frame baru. Di Windows sleep dibulatkan ke
    #   tick ~15 ms, tetap di bawah anggaran 40 ms per frame pada 25 fps.
    # ------------------------------------------------------------------
    LIVE_OPEN_TIMEOUT_MS = 10000
    LIVE_READ_TIMEOUT_MS = 5000
    LIVE_SOURCE_LOST_SECONDS = 10
    LIVE_POLL_INTERVAL = 0.005

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

        box_w = 260
        box_h = 90
        margin = 20

        x1 = max(0, width - box_w - margin)
        y1 = margin
        x2 = max(0, width - margin)
        y2 = margin + box_h

        # Menggelapkan kotak = mencampur piksel di dalamnya dengan hitam,
        # jadi cukup menskalakan ROI-nya. Versi sebelumnya menyalin SELURUH
        # frame lalu meng-addWeighted seluruh frame hanya untuk menggelapkan
        # kotak 260x90 — pada 1080p itu 7 ms terbuang tiap frame. Hasil
        # pikselnya identik: di luar kotak, addWeighted lama menghasilkan
        # 0.45*frame + 0.55*frame = frame.
        roi = frame_out[y1:y2, x1:x2]

        frame_out[y1:y2, x1:x2] = cv2.convertScaleAbs(roi, alpha=0.55)

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

        # Normalisasi + colormap dikerjakan pada resolusi density map
        # (mis. 68x120), baru hasil BERWARNA-nya yang diperbesar. Versi
        # sebelumnya memperbesar dulu ke ukuran frame lalu menormalkan dan
        # memetakan warna, jadi dua operasi termahal itu berjalan pada 2
        # juta piksel alih-alih 8 ribu. NORM_MINMAX menghasilkan rentang
        # yang sama pada kedua urutan karena interpolasi bilinear tidak
        # pernah melampaui nilai ekstrem aslinya.
        normalized = cv2.normalize(
            density_map, None, 0, 255, cv2.NORM_MINMAX
        ).astype(np.uint8)

        heatmap = cv2.applyColorMap(normalized, cv2.COLORMAP_JET)

        heatmap = cv2.resize(
            heatmap, (w, h), interpolation=cv2.INTER_LINEAR
        )

        return cv2.addWeighted(frame, 0.6, heatmap, 0.4, 0)

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

        # Loop ini didominasi operasi OpenCV yang murah (inferensi DM-Count
        # jalan di thread terpisah tiap FRAME_INTERVAL frame), jadi tanpa
        # pacing ia selesai jauh lebih cepat dari durasi asli video dan
        # umpan langsungnya terlihat dipercepat — makin kencang mesinnya,
        # makin ngebut. Dijadwalkan ke fps sumber supaya lajunya sama di
        # MacBook maupun Windows. Lihat utils/pacing.py.
        pacer = FramePacer(fps)
        pacer.start()

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

                frame_base64 = self._encode_stream_frame(annotated)

                if frame_base64 is not None:

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

                # Menahan loop ke fps sumber. Sekaligus mengembalikan
                # kendali ke event loop supaya task inferensi di background
                # sempat dicek/diselesaikan tanpa menunggu I/O.
                await pacer.wait()

        finally:

            pacer.stop()

            print(f"[crowd] {pacer.report()}")

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

    async def _send_live(self, job_id, payload, stop_event):
        """Kirim ke klien sesi live. Socket yang sudah putus bukan galat di
        sini — itu cara normal sesi berakhir kalau tab ditutup — jadi
        kegagalan kirim cukup menghentikan sesi, bukan melempar exception
        yang akan tercetak sebagai traceback."""

        try:
            await manager.send(job_id, payload)
            return True
        except Exception:
            stop_event.set()
            return False

    async def predict_live_stream(
        self,
        job_id: str,
        network_url: str,
        stop_event: asyncio.Event
    ):
        """Crowd counting pada stream UDP. Beda dari predict_video_stream:

        - tidak ada VideoWriter/FFmpeg — hasil sesi live hanya ditampilkan,
          tidak ditulis ke disk, jadi pesan `finished` tidak membawa
          temp_path/preview_url;
        - tidak ada FramePacer — sumber sudah realtime; frame diambil dari
          LatestFrameReader yang otomatis melompati frame tertunggak;
        - tidak ada total_frames/progress — sesi berakhir karena klien
          mengirim stop, socket putus, atau sumber diam selama
          LIVE_SOURCE_LOST_SECONDS.
        """

        start = time.time()

        reader = LatestFrameReader(
            network_url,
            open_timeout_ms=self.LIVE_OPEN_TIMEOUT_MS,
            read_timeout_ms=self.LIVE_READ_TIMEOUT_MS
        )

        try:

            opened = await asyncio.to_thread(reader.open)

            if not opened:

                await self._send_live(
                    job_id,
                    {
                        "error": (
                            f"Tidak ada stream yang diterima dari {network_url} "
                            f"dalam {self.LIVE_OPEN_TIMEOUT_MS // 1000} detik. "
                            "Pastikan pengirim aktif dan port tidak sedang "
                            "dipakai proses lain (mis. Live Stream)."
                        )
                    },
                    stop_event
                )

                return

            print(
                f"[crowd-live] tersambung ke {network_url} "
                f"(fps dilaporkan sumber: {reader.fps:.2f})"
            )

            last_density_map = None
            last_count = 0
            counter_task = None

            last_seq = 0
            frame_index = 0
            first_frame_at = None
            last_frame_at = None
            counts = []
            end_reason = "stopped"

            try:

                while not stop_event.is_set():

                    seq, frame = reader.latest()

                    if seq == last_seq:

                        if (
                            reader.seconds_since_last_frame()
                            > self.LIVE_SOURCE_LOST_SECONDS
                        ):
                            end_reason = "source_lost"
                            break

                        await asyncio.sleep(self.LIVE_POLL_INTERVAL)
                        continue

                    last_seq = seq

                    last_frame_at = time.time()

                    if first_frame_at is None:
                        first_frame_at = last_frame_at

                    # Pola inferensi sama dengan predict_video_stream: hasil
                    # DM-Count dipanen begitu threadnya selesai, inferensi
                    # baru hanya dimulai tiap FRAME_INTERVAL frame yang
                    # diproses dan kalau tidak ada yang sedang berjalan.
                    if counter_task is not None and counter_task.done():

                        try:
                            last_density_map, raw_count, _ = counter_task.result()
                            last_count = math.ceil(raw_count)
                        except Exception:
                            print(
                                f"[crowd-live] DM-Count error at frame {frame_index}:\n"
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

                    if last_density_map is not None:
                        annotated = self._blend_heatmap(last_density_map, frame)
                        count = last_count
                    else:
                        annotated = frame.copy()
                        count = 0

                    annotated = self._draw_count_overlay(
                        annotated,
                        frame.shape[1],
                        count
                    )

                    counts.append(count)

                    frame_base64 = self._encode_stream_frame(annotated)

                    if frame_base64 is not None:

                        sent = await self._send_live(
                            job_id,
                            {
                                "frame": frame_base64,
                                "count": count,
                                "live": True,
                                "progress": None,
                                "frame_number": frame_index,
                                "total_frame": None,
                                "elapsed_seconds": round(time.time() - start, 1)
                            },
                            stop_event
                        )

                        if not sent:
                            break

                    frame_index += 1

                    # Kalau frame baru selalu sudah menunggu, loop tidak
                    # pernah masuk sleep di atas — serahkan kendali supaya
                    # task inferensi & listener stop tetap dijadwalkan.
                    await asyncio.sleep(0)

            finally:

                if counter_task is not None:
                    try:
                        await counter_task
                    except Exception:
                        print(
                            "[crowd-live] Final DM-Count error:\n"
                            f"{traceback.format_exc()}"
                        )

            # Diukur sampai frame terakhir, bukan sampai sesi berakhir —
            # kalau sesi berakhir karena sumber diam, jeda tunggu itu tidak
            # boleh ikut menurunkan angka fps.
            streaming_seconds = (
                last_frame_at - first_frame_at
                if first_frame_at is not None
                else 0
            )

            print(
                f"[crowd-live] selesai ({end_reason}) | "
                f"{frame_index} frame dalam {streaming_seconds:.1f}s"
            )

            if not counts:
                counts = [0]

            await self._send_live(
                job_id,
                {
                    "finished": True,
                    "live": True,
                    "reason": end_reason,
                    "media_type": "VIDEO",
                    "processing_type": "CROWD_COUNTING",
                    "processing_time": round(time.time() - start, 2),
                    "summary": {
                        "max_count": max(counts),
                        "min_count": min(counts),
                        "average_count": math.ceil(sum(counts) / len(counts)),
                        "last_count": counts[-1],
                        "total_frames": frame_index,
                        "fps": (
                            round(frame_index / streaming_seconds, 2)
                            if streaming_seconds > 0
                            else 0
                        )
                    }
                },
                stop_event
            )

        finally:

            # Ringkasan sudah terkirim di atas; menunggu thread pembaca
            # (paling lama ~READ_TIMEOUT kalau sumber sedang diam) tidak
            # lagi menahan klien.
            reader.stop()

            await asyncio.to_thread(reader.join)
