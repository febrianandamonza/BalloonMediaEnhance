import cv2
import base64

from services.detector import ObjectDetector
from utils.websocket_manager import manager

class VideoDetector:

    def __init__(self):
        self.detector = ObjectDetector()

    async def process(
        self,
        job_id: str,
        input_path: str
    ):

        cap = cv2.VideoCapture(input_path)

        total_frame = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        frame_number = 0

        while True:

            ret, frame = cap.read()

            if not ret:
                break

            frame_number += 1

            result = self.detector.detect_frame(frame)

            progress = int(
                frame_number / total_frame * 100
            )

            _, buffer = cv2.imencode(
                ".jpg",
                result["frame"]
            )

            frame_base64 = base64.b64encode(
                buffer
            ).decode()

            await manager.send(
                job_id,
                {
                    "progress": progress,
                    "frame": frame_base64,
                    "objects": result["objects"]
                }
            )

        cap.release()