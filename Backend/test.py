from ultralytics import YOLO

# Load model
model = YOLO("yolo11n.pt")

# Jalankan deteksi
results = model.predict(
    source="input/images2.png",
    conf=0.10,
    imgsz=1280,
    save=True
)

print(results[0].boxes)