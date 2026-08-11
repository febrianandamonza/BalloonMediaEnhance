import sys
import numpy as np
from pathlib import Path
import cv2

BASE_DIR = Path(__file__).resolve().parent.parent

sys.path.insert(
    0,
    str(BASE_DIR / "third-party" / "Real-ESRGAN")
)

from utils.file_manager import FileManager
from realesrgan.archs.srvgg_arch import SRVGGNetCompact
from realesrgan import RealESRGANer

class ImageEnhancer:

    def __init__(self):
        
        self.upsampler = None


    def read_image(self, image_path):

        image = cv2.imread(image_path)

        if image is None:
            raise Exception(
                f"Gagal membaca image : {image_path}"
            )
        
        return image
    
    def enhance_frame(
        self,
        frame,
        mode="quality",
        outscale=2,
        denoise=20,
        contrast=15,
        sharpness=20
    ):

        if mode == "fast":
            return self.enhance_frame_fast(
                frame,
                denoise=denoise,
                contrast=contrast,
                sharpness=sharpness
                )

        elif mode == "quality":
            return self.enhance_frame_quality(
                frame,
                outscale
            )

        raise ValueError(
            f"Unknown enhancement mode: {mode}"
        ) 
        
    
    def enhance_frame_fast(
        self,
        frame,
        denoise=20,
        contrast=15,
        sharpness=20
    ):

        # 1. Blur ringan
        # blur = cv2.GaussianBlur(frame, (3, 3), 0)

        # 

        sigma = 5 + (denoise * 0.45)

        blur = cv2.bilateralFilter(
            frame,
            d=3,
            sigmaColor=sigma,
            sigmaSpace=sigma
        )

        # # 2. CLAHE lebih lembut
        lab = cv2.cvtColor(blur, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)

        clip_limit = 1.0 + (contrast * 0.05)

        clahe = cv2.createCLAHE(
            clipLimit=clip_limit,
            tileGridSize=(8, 8)
        )

        l = clahe.apply(l)

        lab = cv2.merge((l, a, b))
        result = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

        # 3. Unsharp Mask ringan
        # kernel = np.array([
        #     [0, -1, 0],
        #     [-1, 5, -1],
        #     [0, -1, 0]
        # ])

        # result = cv2.filter2D(frame, -1, kernel)

        weight = 1.0 + (sharpness * 0.01)

        gaussian = cv2.GaussianBlur(frame, (0, 0), 1.0)

        result = cv2.addWeighted(
            result,
            weight,
            gaussian,
            -(weight - 1),
            0
        )

        return result
    
    def enhance_frame_quality(
        self,
        frame,
        outscale=2
    ):

        output, _ = self.upsampler.enhance(
            frame,
            outscale=outscale
        )

        return output

    def enhance_frame_balanced(
        self,
        frame,
        outscale=4
    ):

        output, _ = self.balanced_upsampler.enhance(
            frame,
            outscale=outscale
        )

        return output
    
    def save_image(self, image, output_path):

        cv2.imwrite(output_path, image)

    def load_model(self):

        model = SRVGGNetCompact(
            num_in_ch=3,
            num_out_ch=3,
            num_feat=64,
            num_conv=32,
            upscale=4,
            act_type="prelu",
        )

        self.upsampler = RealESRGANer(
            scale=4,
            model_path="weights/realesr-general-x4v3.pth",
            model=model,
            tile=0,
            tile_pad=10,
            pre_pad=0,
            half=False,
        )

        print("Balanced model loaded.")
    
    
    def enhance_image(
        self,
        image_path,
        mode="quality",
        outscale=4
    ):

        image = self.read_image(image_path)

        enhanced = self.enhance_frame(
            image,
            mode=mode,
            outscale=outscale
        )

        output_path = FileManager.build_temp_file_path(

            "enhancement",

            image_path

        )

        self.save_image(

            enhanced,

            str(output_path)

        )

        print("Image berhasil di-enhance.")
        print(f"Enhanced image saved to {output_path}.")

        return str(output_path)