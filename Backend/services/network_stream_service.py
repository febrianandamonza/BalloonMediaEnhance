import os
import shutil
import signal
import subprocess
import uuid
from pathlib import Path
from urllib.parse import urlparse

from utils.exceptions import BadRequestException, NotFoundException

BASE_DIR = Path(__file__).resolve().parent.parent
STREAMS_DIR = BASE_DIR / "streams"


class NetworkStreamService:

    def __init__(self):

        self.streams_dir = STREAMS_DIR

        os.makedirs(self.streams_dir, exist_ok=True)

        self.running_processes: dict[str, subprocess.Popen] = {}

    def ffmpeg_available(self) -> bool:

        return shutil.which("ffmpeg") is not None

    # def start_stream(self, network_url: str) -> tuple[str, str]:

        stream_id = uuid.uuid4().hex[:8]

        stream_folder = self.streams_dir / stream_id

        os.makedirs(stream_folder, exist_ok=True)

        output_playlist = stream_folder / "output.m3u8"

        cmd = ["ffmpeg", "-fflags", "nobuffer"]

        if network_url.startswith("rtsp://"):

            cmd += ["-rtsp_transport", "tcp"]

        cmd += [
            "-i", network_url,
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-tune", "zerolatency",
            "-c:a", "aac",
            "-f", "hls",
            "-hls_time", "2",
            "-hls_list_size", "5",
            "-hls_flags", "delete_segments+append_list",
            str(output_playlist),
        ]

        with open(stream_folder / "ffmpeg.log", "wb") as log_file:

            process = subprocess.Popen(
                cmd,
                stdout=log_file,
                stderr=subprocess.STDOUT,
            )

        self.running_processes[stream_id] = process

        return stream_id, f"/stream/{stream_id}/output.m3u8"


    def start_stream(self, network_url: str) -> tuple[str, str]:

        stream_id = uuid.uuid4().hex[:8]

        stream_folder = self.streams_dir / stream_id
        os.makedirs(stream_folder, exist_ok=True)

        output_playlist = stream_folder / "output.m3u8"

        # cmd = [
        #     "ffmpeg",
        #     "-fflags", "nobuffer",
        #     "-i", network_url,

        #     "-c:v", "libx264",
        #     "-preset", "veryfast",
        #     "-tune", "zerolatency",

        #     "-c:a", "aac",

        #     "-f", "hls",
        #     "-hls_time", "2",
        #     "-hls_list_size", "5",
        #     "-hls_flags", "delete_segments+append_list",
        #     str(output_playlist),
        # ]

        cmd = [
            "ffmpeg",

            "-i", network_url,

            "-c:v", "libx264",
            "-preset", "veryfast",
            "-tune", "zerolatency",

            "-g", "60",
            "-keyint_min", "60",
            "-sc_threshold", "0",

            "-pix_fmt", "yuv420p",

            "-c:a", "aac",

            "-f", "hls",
            "-hls_time", "2",
            "-hls_list_size", "5",
            "-hls_flags", "delete_segments+append_list+independent_segments",

            str(output_playlist),
        ]

        log_file = open(stream_folder / "ffmpeg.log", "wb")

        process = subprocess.Popen(
            cmd,
            stdout=log_file,
            stderr=subprocess.STDOUT,
        )

        self.running_processes[stream_id] = process

        print("STREAM ID :", stream_id)
        print("PLAYLIST :", output_playlist)
        print("EXISTS :", output_playlist.exists())

        return stream_id, f"/stream/{stream_id}/output.m3u8"

    def validate_udp_url(self, network_url: str) -> str:
        """URL ini diteruskan apa adanya ke FFmpeg (lewat cv2.VideoCapture),
        jadi skemanya wajib dikunci ke udp:// — tanpa itu klien bisa
        mengirim path lokal (mis. C:/rahasia.mp4) atau protokol FFmpeg lain
        (file:, concat:) dan backend akan membaca lalu men-stream isinya.
        Query string tetap diizinkan untuk opsi protokol UDP FFmpeg seperti
        ?overrun_nonfatal=1&fifo_size=50000000."""

        url = network_url.strip()

        if not url or any(ch.isspace() for ch in url):
            raise BadRequestException(
                "URL sumber UDP kosong atau mengandung spasi."
            )

        parsed = urlparse(url)

        try:
            port = parsed.port
        except ValueError:
            port = None

        if parsed.scheme != "udp" or not port:
            raise BadRequestException(
                "URL sumber harus berformat udp://<host>:<port>, "
                "mis. udp://@0.0.0.0:15004."
            )

        return url

    def stop_stream(self, stream_id: str) -> None:

        process = self.running_processes.get(stream_id)

        if process is None:

            raise NotFoundException("Stream tidak ditemukan.")

        process.send_signal(signal.SIGTERM)

        process.wait(timeout=5)

        del self.running_processes[stream_id]

        stream_folder = self.streams_dir / stream_id

        shutil.rmtree(stream_folder, ignore_errors=True)

    def health(self) -> dict:

        return {
            "status": "ok",
            "active_streams": list(self.running_processes.keys()),
        }


network_stream_service = NetworkStreamService()
