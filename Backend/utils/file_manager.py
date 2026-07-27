from pathlib import Path
from datetime import datetime
import shutil
from uuid import uuid4

class FileManager:

    INPUT_DIR = Path("input")
    OUTPUT_DIR = Path("output")

    @classmethod
    def save_upload_file(cls, upload_file):

        cls.INPUT_DIR.mkdir(exist_ok=True)

        ext = Path(upload_file.filename).suffix

        filename = f"{uuid4()}{ext}"

        input_path = cls.INPUT_DIR / filename

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
