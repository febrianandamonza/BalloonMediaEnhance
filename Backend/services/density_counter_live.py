import asyncio
import base64
import math
import os
import subprocess
import time
import traceback
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np

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

    async def _encode_and_send(self, job_id, annotated, meta):
        """Encode JPEG di thread terpisah lalu kirim ke WebSocket — dipakai
        secara fire-and-forget dari predict_video_stream (pola & alasan
        sama dengan services/detector.py) supaya encode tidak menahan
        jalur kritis pacing frame."""

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
        """Versi predict_live_stream: pakai send_live (bukan manager.send
        langsung) supaya socket yang putus di tengah sesi men-set
        stop_event alih-alih cuma mencetak error."""

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

    async def predict_video_stream(
        self,
        job_id: str,
        input_video,
        output_video,
        stop_event: asyncio.Event | None = None
    ):

        start = time.time()

        # MSMF (Media Foundation Windows) lewat decode/encode hardware jauh
        # lebih cepat dari backend FFmpeg (software) bawaan OpenCV untuk
        # MP4 — TAPI terbukti tidak cocok untuk MPEG-TS (.ts): jauh lebih
        # lambat dan bahkan bisa berhenti membaca di tengah jalan. Jadi
        # MSMF hanya dipakai utk .mp4; ekstensi lain pakai FFmpeg. Detail
        # lengkap & angka pengukurannya ada di services/detector.py
        # (detect_video_stream), yang punya masalah identik.
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

        if fps <= 0:
            fps = 25.0

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")

        temp_video = str(output_video).replace(".mp4", "_temp.mp4")

        writer = cv2.VideoWriter(
            temp_video,
            cv2.CAP_MSMF,
            fourcc,
            fps,
            (width, height)
        )

        if not writer.isOpened():
            writer = cv2.VideoWriter(temp_video, fourcc, fps, (width, height))

        if not writer.isOpened():
            raise Exception("Failed to create VideoWriter")

        last_density_map = None
        last_count = 0
        counter_task = None

        # Sama seperti detect_video_stream: encode+kirim dilempar ke
        # background (lihat _encode_and_send) supaya tidak menahan loop
        # baca/tulis frame.
        send_task = None

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

                # Klien menekan Hentikan atau socketnya putus (lihat
                # listen_for_stop) — tanpa ini, sesi berkas akan tetap
                # memproses SISA SELURUH video walau tidak ada yang
                # menunggu hasilnya lagi (bug yang sama seperti
                # detect_video_stream sebelum diperbaiki).
                if stop_event is not None and stop_event.is_set():
                    break

                # to_thread supaya event loop tidak diblok — memberi
                # giliran ke task encode+kirim yang berjalan di background
                # (lihat catatan lengkap di detect_video_stream).
                ret, frame = await asyncio.to_thread(cap.read)

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

                # to_thread — sama alasannya dengan cap.read() di atas.
                await asyncio.to_thread(writer.write, annotated)

                counts.append(count)

                is_last_frame = frame_index == total_frames - 1

                meta = {
                    "count": count,
                    "progress": round(
                        (frame_index + 1) * 100 / total_frames, 2
                    ),
                    "frame_number": frame_index,
                    "total_frame": total_frames,
                }

                # Sama seperti detect_video_stream: encode+kirim di
                # background, giliran baru cuma dibuat kalau yang
                # sebelumnya sudah selesai — menjamin urutan pesan ke
                # browser tanpa queue eksplisit. Frame terakhir wajib
                # ditunggu & dikirim langsung supaya hasil final pasti
                # sampai.
                if is_last_frame:

                    if send_task is not None:
                        try:
                            await send_task
                        except Exception:
                            print(
                                f"[crowd] Encode/WS error at frame "
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
                                f"[crowd] Encode/WS error at frame "
                                f"{frame_index}:\n"
                                f"{traceback.format_exc()}"
                            )

                    send_task = asyncio.create_task(
                        self._encode_and_send(job_id, annotated, meta)
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

            if send_task is not None:
                try:
                    await send_task
                except Exception:
                    print(
                        "[crowd] Final encode/WS error:\n"
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
                # Kalau sesi dihentikan lebih awal (stop_event), temp_video
                # cuma berisi sebagian frame sementara audio dipetakan dari
                # input_video yang panjangnya utuh — tanpa ini, hasil
                # akhirnya bisa punya audio yang lebih panjang dari videonya.
                "-shortest",
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

        # Kalau sesi dihentikan lewat tombol Hentikan, klien biasanya
        # sudah menutup socket-nya sebelum baris ini sempat jalan — kirim
        # ke socket yang sudah putus melempar exception. Socket putus
        # bukan kegagalan, jadi cukup dicatat, bukan dilempar ulang (lihat
        # catatan sama di detect_video_stream).
        try:
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
        except Exception:
            print(
                "[crowd] Gagal mengirim pesan finished (klien mungkin "
                "sudah putus):\n"
                f"{traceback.format_exc()}"
            )

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

            # Sama seperti batas resolusi unggahan berkas — lihat catatan
            # lengkap di detector.py (detect_live_stream), yang punya
            # pengecekan identik.
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
                f"[crowd-live] tersambung ke {network_url} "
                f"({reader.width}x{reader.height} "
                f"@ {reader.fps:.2f}fps dilaporkan sumber)"
            )

            last_density_map = None
            last_count = 0
            counter_task = None

            # Sama seperti predict_video_stream: encode+kirim di background.
            send_task = None

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

                    meta = {
                        "count": count,
                        "live": True,
                        "progress": None,
                        "frame_number": frame_index,
                        "total_frame": None,
                        "elapsed_seconds": round(time.time() - start, 1),
                    }

                    # Sama seperti predict_video_stream: giliran baru
                    # cuma dibuat kalau yang sebelumnya sudah selesai.
                    # Kegagalan kirim (mis. socket putus) sudah men-set
                    # stop_event lewat send_live di _encode_and_send_live,
                    # jadi while-loop di atas berhenti sendiri pada
                    # iterasi berikutnya tanpa perlu nilai balik di sini.
                    if send_task is None or send_task.done():

                        if send_task is not None:
                            try:
                                send_task.result()
                            except Exception:
                                print(
                                    f"[crowd-live] Encode/WS error at "
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

                if send_task is not None:
                    try:
                        await send_task
                    except Exception:
                        print(
                            "[crowd-live] Final encode/WS error:\n"
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

            await send_live(
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
