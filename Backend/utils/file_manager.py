from pathlib import Path
from datetime import datetime

class FileManager:

    OUTPUT_DIR = 'output'

    @staticmethod
    def ensure_output_dir():

        Path(FileManager.OUTPUT_DIR).mkdir(
            parents=True,
            exist_ok=True
        )

    @staticmethod
    def build_output_path(image_path: str, suffix: str):

        file = Path(image_path)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        output_dir = Path("output")
        output_dir.mkdir(exist_ok=True)

        filename = f"{file.stem}_{suffix}_{timestamp}{file.suffix}"

        return str(output_dir / filename)
