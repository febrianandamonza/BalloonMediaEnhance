import cv2
import time

from utils.config import VIDEO_MAX_WIDTH, VIDEO_OUTSCALE
from services.enhancer import ImageEnhancer

enhancer = ImageEnhancer()

enhancer.load_model()

class VideoEnhancer:

    def enhance_video(
        self,
        input_video,
        output_video,
        mode="fast",

        denoise=20,
        contrast=15,
        sharpness=20
    ):

        start = time.time()

        cap = cv2.VideoCapture(input_video)

        if not cap.isOpened():
            raise Exception("Cannot open video.")

        fps = cap.get(cv2.CAP_PROP_FPS)

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        resize_ratio = 1.0

        if width > VIDEO_MAX_WIDTH:

            resize_ratio = VIDEO_MAX_WIDTH / width

            process_width = VIDEO_MAX_WIDTH
            process_height = int(height * resize_ratio)

        else:

            process_width = width
            process_height = height

        # ==========================================
        # Tentukan ukuran output berdasarkan mode
        # ==========================================
        if mode == "quality":
            output_width = process_width * VIDEO_OUTSCALE
            output_height = process_height * VIDEO_OUTSCALE
        else:
            output_width = width
            output_height = height

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")

        writer = cv2.VideoWriter(
            output_video,
            fourcc,
            fps,
            (output_width, output_height)
        )

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        frame_count = 0

        while True:

            frame_start = time.time()

            ret, frame = cap.read()

            if not ret:
                break

            # Resize hanya jika video terlalu besar
            if resize_ratio != 1.0:

                frame = cv2.resize(
                    frame,
                    (process_width, process_height),
                    interpolation=cv2.INTER_AREA
                )

            enhanced = enhancer.enhance_frame(
                frame,
                mode=mode,
                outscale=VIDEO_OUTSCALE,
                denoise=denoise,
                contrast=contrast,
                sharpness=sharpness
            )

            # ==========================================
            # Fast mode -> kembalikan ke ukuran asli
            # Quality -> biarkan hasil ESRGAN
            # ==========================================
            if mode == "fast" and resize_ratio != 1.0:

                enhanced = cv2.resize(
                    enhanced,
                    (width, height),
                    interpolation=cv2.INTER_LINEAR
                )

            # Debug ukuran frame
            if frame_count == 0:
                print(f"Writer Size : {output_width}x{output_height}")
                print(f"Frame Size  : {enhanced.shape[1]}x{enhanced.shape[0]}")

            # Validasi ukuran
            if (
                enhanced.shape[1] != output_width or
                enhanced.shape[0] != output_height
            ):
                raise ValueError(
                    f"Frame size mismatch. "
                    f"Expected {output_width}x{output_height}, "
                    f"Got {enhanced.shape[1]}x{enhanced.shape[0]}"
                )

            writer.write(enhanced)

            frame_time = time.time() - frame_start

            frame_count += 1

            if frame_count % 10 == 0:
                progress = frame_count / total_frames * 100
                print(
                    f"Processed {frame_count}/{total_frames} "
                    f"({progress:.1f}%) "
                    f"({frame_time:.2f}s/frame)"
                )

        cap.release()
        writer.release()

        return {
            "frame_count": frame_count,
            "fps": fps,
            "processing_time": round(time.time() - start, 2),
            "input_resolution": f"{width}x{height}",
            "processing_resolution": f"{process_width}x{process_height}",
            "output_resolution": f"{output_width}x{output_height}"
        }