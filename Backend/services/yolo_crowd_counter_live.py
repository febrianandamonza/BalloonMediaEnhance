import threading

import cv2
from ultralytics import YOLO

from services.density_counter_live import VideoCrowdCounterLive
from services.detector import YOLO_WEIGHT, ObjectDetector


class YoloCrowdCounterLive(VideoCrowdCounterLive):
    """Crowd counting berbasis deteksi YOLO — hanya kelas "person".

    Memakai bobot, confidence, dan imgsz yang sama dengan modul Video
    Analytic (services/detector.py), serta pipeline pacing/encode/kirim
    WebSocket yang sama dengan DM-Count (VideoCrowdCounterLive). Bedanya
    hanya di _infer/_render: jumlah = banyaknya kotak orang, dan frame
    digambari kotak alih-alih heatmap.

    Model YOLO dimuat terpisah (lazy, saat sesi YOLO pertama) — bukan
    memakai instance milik api/detection.py — karena predictor ultralytics
    tidak aman dipanggil bersamaan dari dua thread, sementara Video
    Analytic dan Crowd Counting bisa berjalan pada saat yang sama.
    """

    # Sama dengan ObjectDetector.FRAME_INTERVAL (sudah diuji di sana).
    FRAME_INTERVAL = ObjectDetector.FRAME_INTERVAL

    CONFIDENCE_THRESHOLD = ObjectDetector.CONFIDENCE_THRESHOLD
    IMGSZ = 1280

    BOX_COLOR = ObjectDetector.CLASS_COLORS["person"]["bgr"]

    def __init__(self):

        super().__init__(density_counter=None)

        self.model = None
        self.person_class = None
        self._load_lock = threading.Lock()

    def _ensure_model(self):

        if self.model is not None:
            return

        with self._load_lock:

            if self.model is not None:
                return

            if not YOLO_WEIGHT.exists():
                raise FileNotFoundError(
                    f"YOLO weight not found: {YOLO_WEIGHT}"
                )

            print("[crowd-yolo] Loading YOLO model...")

            model = YOLO(str(YOLO_WEIGHT))

            self.person_class = next(
                cls for cls, name in model.names.items()
                if name == "person"
            )

            self.model = model

            print("[crowd-yolo] YOLO model loaded.")

    def _infer(self, frame):

        self._ensure_model()

        # Pre-resize ke lebar imgsz sebelum masuk YOLO — alasan & angka
        # pengukurannya ada di ObjectDetector.detect_video_stream.
        detect_input = frame
        scale = 1.0

        frame_w = frame.shape[1]

        if frame_w > self.IMGSZ:
            detect_input = cv2.resize(
                frame,
                (self.IMGSZ, int(frame.shape[0] * self.IMGSZ / frame_w)),
                interpolation=cv2.INTER_LINEAR
            )
            scale = frame_w / detect_input.shape[1]

        results = self.model.predict(
            source=detect_input,
            conf=self.CONFIDENCE_THRESHOLD,
            imgsz=self.IMGSZ,
            classes=[self.person_class],
            verbose=False
        )

        boxes = []

        for box in results[0].boxes:

            x1, y1, x2, y2 = (float(v) * scale for v in box.xyxy[0])

            boxes.append((
                int(x1), int(y1), int(x2), int(y2),
                float(box.conf[0])
            ))

        return boxes, len(boxes)

    def _render(self, result, frame):

        annotated = frame.copy()

        for x1, y1, x2, y2, conf in result:

            cv2.rectangle(
                annotated,
                (x1, y1),
                (x2, y2),
                self.BOX_COLOR,
                2
            )

            cv2.putText(
                annotated,
                f"person {conf:.2f}",
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                self.BOX_COLOR,
                2
            )

        return annotated
