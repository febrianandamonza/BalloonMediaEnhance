from ultralytics import YOLO
import cv2

from utils.file_manager import FileManager

class ObjectDetector:

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
        self.model = YOLO("yolo11x.pt")

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

    def save_image(self, image, output_path):

        cv2.imwrite(output_path, image)

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

        output_path = FileManager.build_output_path(image_path)

        self.save_image(
            annotated,
            output_path
        )

        return output_path, objects