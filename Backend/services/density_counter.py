import sys
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image
from torchvision import transforms

import time
import matplotlib.pyplot as plt

BASE_DIR = Path(__file__).resolve().parent.parent
MAX_WIDTH = 640

sys.path.insert(
    0,
    str(BASE_DIR / "third-party" / "DM-Count")
)

from models import vgg19

class DensityCounter:

    def __init__(self):

        if torch.backends.mps.is_available():
            self.device = torch.device("mps")
        elif torch.cuda.is_available():
            self.device = torch.device("cuda")
        else:
            self.device = torch.device("cpu")

        print(f"Using device: {self.device}")

        self.model = self.load_model()

        self.transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(
                [0.485, 0.456, 0.406],
                [0.229, 0.224, 0.225]
            )
        ])

    def load_model(self):

        model = vgg19()

        weight_path = BASE_DIR / "weights" / "dmcount.pth"

        model.load_state_dict(
            torch.load(
                weight_path,
                map_location=self.device
            )
        )

        model.to(self.device)

        model.eval()

        return model
    
    

    # def read_image(self, image_path):

    #     image = Image.open(image_path).convert("RGB")

    #     if MAX_WIDTH and image.width > MAX_WIDTH:

    #         ratio = MAX_WIDTH / image.width

    #         new_height = int(image.height * ratio)

    #         image = image.resize(
    #             (MAX_WIDTH, new_height),
    #             Image.BILINEAR
    #         )

    #     tensor = self.transform(image).unsqueeze(0)

    #     return tensor.to(self.device), np.array(image)

    def read_image(self, image_path):

        frame = np.array(
            Image.open(image_path).convert("RGB")
        )

        return self.preprocess_frame(frame)
    
    def preprocess_frame(self, frame):

        image = Image.fromarray(frame)

        if MAX_WIDTH and image.width > MAX_WIDTH:

            ratio = MAX_WIDTH / image.width

            new_height = int(image.height * ratio)

            image = image.resize(
                (MAX_WIDTH, new_height),
                Image.BILINEAR
            )

        tensor = self.transform(image).unsqueeze(0)

        return tensor.to(self.device), np.array(image)

    def predict_frame(self, frame):

        tensor, original = self.preprocess_frame(frame)

        with torch.no_grad():

            density_map, _ = self.model(tensor)

        count = density_map.sum().item()

        return (
            density_map.squeeze().cpu().numpy(),
            count,
            original
        )
    
    # def predict(self, image_path):

    #     tensor, original = self.read_image(image_path)

    #     with torch.no_grad():

    #         density_map, _ = self.model(tensor)

    #     count = density_map.sum().item()

    #     return density_map.squeeze().cpu().numpy(), count, original

    def predict(self, image_path):

        frame = np.array(
            Image.open(image_path).convert("RGB")
        )

        return self.predict_frame(frame)
    
    def predict_video_frame(
        self,
        frame
    ):

        density_map, count, image = self.predict_frame(frame)

        heatmap = self.create_heatmap(
            density_map,
            image
        )

        return {
            "frame": heatmap,
            "count": int(round(count))
        }
        
    def create_heatmap(
        self,
        density_map,
        original_image
    ):

        h, w = original_image.shape[:2]

        density_map = cv2.resize(
            density_map,
            (w, h)
        )

        density_map = cv2.normalize(
            density_map,
            None,
            0,
            255,
            cv2.NORM_MINMAX
        )

        density_map = density_map.astype(np.uint8)

        heatmap = cv2.applyColorMap(
            density_map,
            cv2.COLORMAP_JET
        )

        overlay = cv2.addWeighted(
            original_image,
            0.6,
            heatmap,
            0.4,
            0
        )

        return overlay
    
    def save_heatmap(
        self,
        heatmap,
        output_path
    ):

        cv2.imwrite(
            str(output_path),
            cv2.cvtColor(
                heatmap,
                cv2.COLOR_RGB2BGR
            )
        )


    def predict_image(
        self,
        input_path,
        output_path
    ):

        start = time.time()

        density_map, count, image = self.predict(
            input_path
        )

        heatmap = self.create_heatmap(
            density_map,
            image
        )

        self.save_heatmap(
            heatmap,
            output_path
        )

        processing_time = round(
            time.time() - start,
            2
        )

        return {
            "count": int(round(count)),
            "heatmap_path": str(output_path),
            "processing_time": processing_time
        }