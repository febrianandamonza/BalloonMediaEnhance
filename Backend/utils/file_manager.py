from pathlib import Path
from datetime import datetime
import shutil

class FileManager:

    INPUT_DIR = Path("input")
    OUTPUT_DIR = Path("output")

    @classmethod
    def save_upload_file(cls, upload_file):

        cls.INPUT_DIR.mkdir(exist_ok=True)

        input_path = cls.INPUT_DIR / upload_file.filename

        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)

        return str(input_path)

    @classmethod
    def build_output_path(cls, input_path):

        cls.OUTPUT_DIR.mkdir(exist_ok=True)

        input_path = Path(input_path)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        filename = f"{input_path.stem}_{timestamp}{input_path.suffix}"

        return str(cls.OUTPUT_DIR / filename)
