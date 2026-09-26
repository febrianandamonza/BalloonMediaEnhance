"""Pacing frame lintas platform untuk streaming video langsung.

Tanpa pacing, loop streaming berjalan secepat hardware mampu sehingga
video terlihat dipercepat di mesin kencang. Tapi pacing yang naif justru
membuat video terlihat SLOW MOTION di Windows. Dua sebabnya ditangani di
sini:

1. Resolusi timer Windows. Secara bawaan Windows memakai tick penjadwal
   15.6 ms, jadi ``asyncio.sleep(0.004)`` benar-benar tidur ~15.5 ms.
   Pada video 30fps yang anggarannya hanya 32.4 ms/frame, kelebihan tidur
   sampai +15 ms di SETIAP frame membuat pemutaran melar (terukur 1.42x
   dari durasi asli pada video 848x480). macOS granularitas timernya
   ~1 ms sehingga tidak pernah terkena — inilah kenapa modul yang sama
   terasa normal di MacBook tapi lambat di Windows.
   ``timeBeginPeriod(1)`` menekan kelebihan itu dari +15 ms ke ~1.5 ms.

2. Drift yang tidak pernah dibayar. Menjadwalkan ulang dari jam sekarang
   setiap kali satu frame telat membuat setiap hambatan sesaat menjadi
   ketertinggalan permanen — video tidak pernah kembali ke lajunya.
   FramePacer memakai jadwal absolut sehingga frame yang sempat telat
   dikejar oleh frame berikutnya yang selesai lebih cepat, dengan batas
   MAX_LAG_FRAMES supaya tidak memberondong setelah stall panjang.
"""

import asyncio
import sys
import time

_WINDOWS = sys.platform == "win32"


class _TimerResolution:
    """Resolusi timer sistem 1 ms, hanya selagi ada sesi streaming.

    Dihitung dengan referensi supaya sesi yang selesai lebih dulu tidak
    menurunkan kembali resolusi milik sesi lain yang masih berjalan.
    Resolusi tinggi sedikit menaikkan konsumsi daya, jadi sengaja tidak
    dipasang permanen selama proses hidup.

    Di luar Windows semua metodenya tidak melakukan apa-apa: macOS dan
    Linux sudah memberi granularitas ~1 ms tanpa diminta.
    """

    def __init__(self):
        self._depth = 0
        self._winmm = None

        if _WINDOWS:
            try:
                import ctypes

                self._winmm = ctypes.WinDLL("winmm")
            except Exception:
                # Bukan kondisi fatal — pacing tetap jalan, hanya kembali
                # ke granularitas 15.6 ms.
                self._winmm = None

    def acquire(self):

        if self._winmm is None:
            return

        if self._depth == 0:
            self._winmm.timeBeginPeriod(1)

        self._depth += 1

    def release(self):

        if self._winmm is None or self._depth == 0:
            return

        self._depth -= 1

        if self._depth == 0:
            self._winmm.timeEndPeriod(1)


# Semua pemakaian terjadi di thread event loop, jadi tidak perlu lock.
_timer = _TimerResolution()


class FramePacer:
    """Menahan loop streaming supaya mengikuti durasi asli video.

    Pemakaian::

        pacer = FramePacer(fps)
        pacer.start()
        try:
            while ...:
                ...
                await pacer.wait()
        finally:
            pacer.stop()
    """

    # Utang keterlambatan yang boleh dikejar, dalam satuan frame.
    #
    # Nilai ini ditala dari pengukuran, bukan ditebak. Inferensi yang
    # berjalan di thread latar menahan GIL sehingga event loop telat
    # bangun; satu siklus inferensi menimbulkan utang yang jauh melebihi
    # durasi inferensinya sendiri. Dengan batas 5 frame, kelebihan utang
    # itu "dimaafkan" dan hilang permanen — terukur masih 1.03-1.11x dari
    # durasi asli. Dengan 20 frame utangnya sempat terbayar penuh di sela
    # antar-inferensi dan hasilnya konsisten 1.00x.
    #
    # Batas ini tetap perlu ada: ia mengunci seberapa jauh video boleh
    # mempercepat diri setelah stall panjang (20 frame ~ 0.65 s pada
    # 30fps). Kalau mesin memang tidak sanggup secara terus-menerus,
    # pacer tidak memberondong — tidak pernah ada slack untuk mengejar,
    # jadi pemutaran hanya melambat dengan wajar.
    MAX_LAG_FRAMES = 20

    def __init__(self, fps, max_lag_frames=MAX_LAG_FRAMES):

        if not fps or fps <= 0:
            fps = 25.0

        self.fps = fps
        self.frame_duration = 1.0 / fps
        self.max_lag = max_lag_frames * self.frame_duration

        self._next = None
        self._started = False

        # Statistik ringan untuk log akhir sesi.
        self.frames = 0
        self.late_frames = 0

    def start(self):

        if self._started:
            return

        _timer.acquire()

        self._started = True
        self._next = time.perf_counter()

    def stop(self):

        if not self._started:
            return

        _timer.release()
        self._started = False

    async def wait(self):
        """Tidur sampai jadwal frame berikutnya. Kembalikan True kalau
        frame ini sempat tertinggal dari jadwal."""

        if not self._started:
            self.start()

        self.frames += 1
        self._next += self.frame_duration

        now = time.perf_counter()
        delay = self._next - now

        if delay > 0:
            await asyncio.sleep(delay)
            return False

        self.late_frames += 1

        # Tertinggal. Jadwal SENGAJA tidak digeser ke jam sekarang supaya
        # frame berikutnya yang lebih cepat bisa membayar ketertinggalan
        # ini — itu bedanya dengan reset yang membuat drift permanen.
        # Yang dibatasi hanya besar utangnya.
        if now - self._next > self.max_lag:
            self._next = now - self.max_lag

        # Tetap serahkan kendali ke event loop supaya task inferensi di
        # background sempat dijadwalkan.
        await asyncio.sleep(0)

        return True

    def report(self):

        if not self.frames:
            return "pacing: tidak ada frame"

        return (
            f"pacing: {self.late_frames}/{self.frames} frame telat "
            f"({self.late_frames * 100 / self.frames:.1f}%) "
            f"@ {self.fps:.2f}fps"
        )
