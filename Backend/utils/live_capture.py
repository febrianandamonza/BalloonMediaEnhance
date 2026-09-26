"""Pembaca stream jaringan (UDP) yang selalu menyajikan frame TERBARU.

Berkas video dibaca frame demi frame secepat loop mampu, lalu ditahan ke
fps aslinya oleh FramePacer. Stream live kebalikannya: sumber sudah
mengirim dengan laju realtime, dan kalau loop pemrosesan sesaat lebih
lambat dari sumber, frame yang belum dibaca menumpuk di buffer FFmpeg —
tampilan makin lama makin tertinggal dari kejadian nyata dan tidak pernah
pulih. Karena itu pembacaan dipindah ke thread sendiri yang terus menguras
stream dan hanya menyimpan frame terakhir; loop pemrosesan tinggal
mengambil frame terbaru dan otomatis melompati frame yang terlewat.

Thread ini juga menjaga event loop tetap bebas: ``cap.read()`` pada stream
jaringan memblokir sampai paket datang (sampai READ_TIMEOUT kalau sumber
diam), dan kalau dipanggil langsung di event loop, pesan "stop" dari
WebSocket tidak akan pernah sempat diproses.
"""

import threading
import time

import cv2


# ----------------------------------------------------------------------
# Parameter sesi live — dipakai bersama crowd counting & deteksi objek.
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
# ----------------------------------------------------------------------
LIVE_OPEN_TIMEOUT_MS = 10000
LIVE_READ_TIMEOUT_MS = 5000
LIVE_SOURCE_LOST_SECONDS = 10
LIVE_POLL_INTERVAL = 0.005


def open_failed_message(network_url: str) -> str:

    return (
        f"Tidak ada stream yang diterima dari {network_url} "
        f"dalam {LIVE_OPEN_TIMEOUT_MS // 1000} detik. "
        "Pastikan pengirim aktif dan port tidak sedang dipakai proses lain "
        "(mis. Live Stream, atau Crowd Counting/Video Analytic yang sedang "
        "membuka port yang sama)."
    )


def resolution_rejected_message(width: int, height: int) -> str:
    """Sama seperti check_video_resolution di utils/video_preview.py, tapi
    utk sumber live (UDP) yang resolusinya baru diketahui SETELAH stream
    terbuka — tidak bisa dicek di awal seperti unggahan berkas."""

    # Import lokal (bukan di atas) supaya live_capture.py — dipakai dari
    # thread pembaca yang ringan — tidak ikut menanggung import cv2/fastapi
    # tambahan dari video_preview.py kalau modul ini dipakai tanpa jalur
    # upload sama sekali.
    from utils.video_preview import MAX_VIDEO_WIDTH, MAX_VIDEO_HEIGHT

    return (
        f"Resolusi stream {width}x{height} melebihi batas maksimum "
        f"{MAX_VIDEO_WIDTH}x{MAX_VIDEO_HEIGHT} (Full HD). Turunkan resolusi "
        "pengirim sebelum mencoba lagi."
    )


class LatestFrameReader:

    def __init__(self, url: str, open_timeout_ms: int, read_timeout_ms: int):

        self.url = url
        self.open_timeout_ms = open_timeout_ms
        self.read_timeout_ms = read_timeout_ms

        self.fps = 0.0
        self.width = 0
        self.height = 0

        self._cap = None
        self._thread = None
        self._stopped = threading.Event()
        self._lock = threading.Lock()

        self._frame = None
        self._seq = 0
        self._last_frame_at = time.monotonic()

    def open(self) -> bool:
        """Memblokir sampai stream terbuka atau open_timeout habis — panggil
        lewat asyncio.to_thread. Untuk UDP, FFmpeg baru menganggap stream
        terbuka setelah paket pertama datang dan formatnya terbaca."""

        cap = cv2.VideoCapture(
            self.url,
            cv2.CAP_FFMPEG,
            [
                cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, self.open_timeout_ms,
                cv2.CAP_PROP_READ_TIMEOUT_MSEC, self.read_timeout_ms,
            ]
        )

        if not cap.isOpened():
            cap.release()
            return False

        self.fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
        self.width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self._cap = cap
        self._last_frame_at = time.monotonic()

        self._thread = threading.Thread(
            target=self._run,
            name="live-frame-reader",
            daemon=True
        )
        self._thread.start()

        return True

    def _run(self):

        # VideoCapture sepenuhnya dimiliki thread ini — dilepas di sini juga,
        # bukan dari thread lain yang bisa saja memanggil release() selagi
        # read() masih memblokir di dalam FFmpeg.
        try:
            while not self._stopped.is_set():

                ok, frame = self._cap.read()

                if not ok:
                    # Sumber diam sampai read timeout, atau paket rusak.
                    # Keputusan menyerah diserahkan ke pemanggil lewat
                    # seconds_since_last_frame(); jeda singkat ini hanya
                    # mencegah busy-loop kalau read() gagal seketika.
                    time.sleep(0.05)
                    continue

                with self._lock:
                    self._frame = frame
                    self._seq += 1
                    self._last_frame_at = time.monotonic()
        finally:
            self._cap.release()

    def latest(self):
        """(nomor urut, frame). Nomor urut yang sama berarti belum ada frame
        baru sejak pengambilan terakhir. cap.read() mengalokasikan array baru
        tiap panggilan, jadi frame yang dikembalikan tidak akan ditimpa thread
        pembaca — tetap wajib di-copy sebelum digambari."""

        with self._lock:
            return self._seq, self._frame

    def seconds_since_last_frame(self) -> float:

        with self._lock:
            return time.monotonic() - self._last_frame_at

    def stop(self):

        self._stopped.set()

    def join(self):
        """Memblokir paling lama sekitar read timeout — panggil lewat
        asyncio.to_thread."""

        if self._thread is not None:
            self._thread.join(timeout=self.read_timeout_ms / 1000 + 1)
