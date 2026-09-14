from pathlib import Path
from datetime import datetime
from uuid import uuid4
import shutil
import mimetypes



class FileManager:

    STORAGE_DIR = Path("storage")

    INPUT_DIR = STORAGE_DIR / "input"

    TEMP_DIR = STORAGE_DIR / "temp"

    MEDIA_DIR = STORAGE_DIR / "media"

    @staticmethod
    def get_preview_url(

        path

    ):

        return "/" + str(path).replace("\\", "/")

    @staticmethod
    def save_upload_file(upload_file):

        FileManager.INPUT_DIR.mkdir(
            parents=True,
            exist_ok=True
        )

        extension = Path(
            upload_file.filename
        ).suffix

        filename = f"{uuid4()}{extension}"

        input_path = (

            FileManager.INPUT_DIR /

            filename

        )

        with open(
            input_path,
            "wb"
        ) as buffer:

            shutil.copyfileobj(
                upload_file.file,
                buffer
            )

        return input_path

    @staticmethod
    def get_temp_directory(
        processing_type: str
    ):

        directory = (

            FileManager.TEMP_DIR /

            processing_type.lower()

        )

        directory.mkdir(
            parents=True,
            exist_ok=True
        )

        return directory

    @staticmethod
    def build_temp_file_path(
        processing_type: str,
        original_filename: str
    ):

        extension = Path(
            original_filename
        ).suffix

        filename = f"{uuid4()}{extension}"

        return (

            FileManager.get_temp_directory(
                processing_type
            )

            / filename

        )

    @staticmethod
    def get_media_directory(
        flight_information_id,
        processing_type
    ):

        directory = (

            FileManager.MEDIA_DIR /

            str(
                flight_information_id
            ) /

            processing_type.lower()

        )

        directory.mkdir(
            parents=True,
            exist_ok=True
        )

        return directory

    @staticmethod
    def build_media_file_path(
        flight_information_id,
        processing_type,
        original_filename
    ):

        extension = Path(
            original_filename
        ).suffix

        filename = f"{uuid4()}{extension}"

        return (

            FileManager.get_media_directory(
                flight_information_id,
                processing_type
            )

            / filename

        )

    @staticmethod
    def copy_to_media(

        temp_path,

        flight_information_id,

        processing_type

    ):

        temp_path = Path(temp_path)

        extension = temp_path.suffix

        stored_filename = f"{uuid4()}{extension}"

        destination_dir = FileManager.get_media_directory(

            flight_information_id,

            processing_type

        )

        destination = destination_dir / stored_filename

        shutil.copy2(

            temp_path,

            destination

        )

        return destination

    @staticmethod
    def save_upload_to_media(
        upload_file,
        flight_information_id,
        processing_type
    ):

        extension = Path(
            upload_file.filename
        ).suffix

        destination = (

            FileManager.get_media_directory(
                flight_information_id,
                processing_type
            )

            / f"{uuid4()}{extension}"

        )

        with open(
            destination,
            "wb"
        ) as buffer:

            shutil.copyfileobj(
                upload_file.file,
                buffer
            )

        return destination

    @staticmethod
    def delete_temp_file(
        path
    ):

        path = Path(path)

        if path.exists():

            path.unlink()

    @staticmethod
    def get_mime_type(path):

        # Windows registry often maps .ts to TypeScript/Qt, not MPEG-TS.
        if Path(path).suffix.lower() == ".ts":

            return "video/mp2t"

        mime_type, _ = mimetypes.guess_type(

            str(path)

        )

        return mime_type


    @staticmethod
    def get_media_type(path):

        extension = Path(path).suffix.lower()

        image_extensions = {

            ".jpg",

            ".jpeg",

            ".png",

            ".tif",

            ".tiff",

            ".bmp",

            ".webp"

        }

        video_extensions = {

            ".mp4",

            ".avi",

            ".mov",

            ".mkv",

            ".ts"

        }

        if extension in image_extensions:

            return "IMAGE"

        if extension in video_extensions:

            return "VIDEO"

        return "UNKNOWN"