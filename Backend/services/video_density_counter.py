import time
import cv2


class VideoCrowdCounter:

    def __init__(self, density_counter):

        self.counter = density_counter

    def predict_video(
        self,
        input_path,
        output_path,
        show_count=True
    ):

        total_start = time.time()

        cap = cv2.VideoCapture(str(input_path))

        if not cap.isOpened():
            raise Exception("Failed to open video.")

        fps = cap.get(cv2.CAP_PROP_FPS)

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        writer = cv2.VideoWriter(
            str(output_path),
            cv2.VideoWriter_fourcc(*"mp4v"),
            fps,
            (width, height)
        )

        print("Writer opened:", writer.isOpened())

        frame_number = 0

        timeline = []
        last_result = None
        SKIP_FRAME = 2

        while cap.isOpened():

            ret, frame = cap.read()

            if not ret:
                break

            frame_start = time.time()

            # result = self.counter.predict_video_frame(frame)
            if frame_number % SKIP_FRAME == 0:

                frame_start = time.time()

                last_result = self.counter.predict_video_frame(frame)

                print(
                    f"Frame {frame_number}/{total_frames} "
                    f"- AI ({time.time() - frame_start:.3f}s)"
                )

            result = last_result

            print(result["frame"].shape)
            print(width, height)

            # frame_out = result["frame"]

            # # Samakan ukuran dengan VideoWriter
            # if frame_out.shape[1] != width or frame_out.shape[0] != height:
            #     frame_out = cv2.resize(frame_out, (width, height))

            # writer.write(frame_out)
            frame_out = result["frame"]

            # Samakan ukuran dengan video asli
            if frame_out.shape[:2] != (height, width):
                frame_out = cv2.resize(
                    frame_out,
                    (width, height),
                    interpolation=cv2.INTER_LINEAR
                )

            # ===========================
            # Overlay Crowd Count
            # ===========================
            if show_count:

                count = result["count"]

                label = "Crowd Count"
                value = str(count)

                font = cv2.FONT_HERSHEY_SIMPLEX

                overlay = frame_out.copy()

                box_w = 260
                box_h = 90

                margin = 20

                x1 = width - box_w - margin
                y1 = margin

                x2 = width - margin
                y2 = margin + box_h

                cv2.rectangle(
                    overlay,
                    (x1, y1),
                    (x2, y2),
                    (0, 0, 0),
                    -1
                )

                frame_out = cv2.addWeighted(
                    overlay,
                    0.45,
                    frame_out,
                    0.55,
                    0
                )

                cv2.putText(
                    frame_out,
                    label,
                    (x1 + 20, y1 + 30),
                    font,
                    0.8,
                    (255,255,255),
                    2,
                    cv2.LINE_AA
                )

                cv2.putText(
                    frame_out,
                    value,
                    (x1 + 20, y1 + 72),
                    font,
                    1.5,
                    (0,255,255),
                    3,
                    cv2.LINE_AA
                )

            writer.write(frame_out)

            timeline.append({
                "frame": frame_number,
                "time": round(frame_number / fps, 2),
                "count": result["count"]
            })

            frame_number += 1

        cap.release()
        writer.release()

        processing_time = round(
            time.time() - total_start,
            2
        )

        counts = [x["count"] for x in timeline]

        return {

            "summary": {

                "max_count": max(counts),

                "min_count": min(counts),

                "average_count": round(
                    sum(counts) / len(counts),
                    2
                ),

                "last_count": counts[-1],

                "total_frames": total_frames,

                "fps": fps,

                "processing_time": processing_time

            },

            "timeline": timeline,

            "output_video": str(output_path)

        }