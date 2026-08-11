from ultralytics import YOLO
import cv2
import base64
import asyncio

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

    FRAME_INTERVAL = 10

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

            while True:

                ret, frame = cap.read()

                if not ret:
                    break

                if frame_index % self.FRAME_INTERVAL == 0 or last_results is None:

                    last_results = self.detect_frame(frame)

                results = last_results

                annotated = frame.copy()
                if frame_index == 0:

                    print(
                        f"Writer Size : {width}x{height}"
                    )

                    print(
                        f"Frame Size : {annotated.shape[1]}x{annotated.shape[0]}"
                    )

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

                    x1, y1, x2, y2 = map(int, box.xyxy[0])

                    cv2.rectangle(
                        annotated,
                        (x1, y1),
                        (x2, y2),
                        (0,255,0),
                        2
                    )

                    cv2.putText(
                        annotated,
                        f"{mapped} {conf:.2f}",
                        (x1,y1-10),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6,
                        (0,255,0),
                        2
                    )

                writer.write(
                    annotated
                )

                _, buffer = cv2.imencode(".jpg", annotated)

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
                        "objects": objects
                    }
                )

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