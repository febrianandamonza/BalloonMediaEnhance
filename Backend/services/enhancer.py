import cv2

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
    
    def enhance_frame(self, frame):
        output, _ = self.upsampler.enhance(frame)

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

        print("Model loaded.")

    def enhance_image(self, image_path):

        image = self.read_image(image_path)

        enhanced = self.enhance_frame(image)

        output_path = FileManager.build_output_path(
            image_path,
            suffix="enhanced"
        )

        self.save_image(
            enhanced,
            output_path
        )

        print("Image berhasil di-enhance.")
        print(f"Enhanced image saved to {output_path}.")

        return output_path