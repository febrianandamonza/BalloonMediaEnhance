from uuid import uuid4
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import Request

from entities.media import Media

from repositories.media_repository import MediaRepository
from repositories.flight_information_repository import FlightInformationRepository

from utils.file_manager import FileManager
from utils.audit_helper import audit

from utils.exceptions import NotFoundException

class MediaService:

    def __init__(self):

        self.repository = MediaRepository()

        self.flight_information_repository = FlightInformationRepository()

    def get_all(
        self,
        db
    ):
        return self.repository.get_all(db)

    def delete(
        self,
        db,
        media_id,
        http_request: Request,
        current_user
    ):
        entity = self.repository.get_by_id(
            db,
            media_id
        )

        if entity is None:
            raise NotFoundException(
                "Media not found."
            )

        original_filename = entity.original_filename
        storage_path = entity.storage_path

        self.repository.delete(
            db,
            entity
        )

        FileManager.delete_temp_file(
            storage_path
        )

        audit.log(
            db=db,
            request=http_request,
            current_user=current_user,
            module="Media",
            action="DELETE",
            entity="Media",
            entity_id=media_id,
            description=f"Media '{original_filename}' deleted."
        )


    def save(
        self,
        db,
        http_request: Request,
        current_user,
        request
    ):
        flight_information = (
            self.flight_information_repository.get_by_id(
                db,
                request.flight_information_id
            )
        )

        if flight_information is None:
            raise NotFoundException(
                "Flight Information not found."
            )

        temp_file = Path(
            request.temp_path
        )

        if not temp_file.exists():
            raise NotFoundException(
                "Temporary file not found."
            )

        destination = FileManager.copy_to_media(
            request.temp_path,
            request.flight_information_id,
            request.processing_type
        )

        entity = Media(
            id=uuid4(),
            flight_information_id=request.flight_information_id,
            media_type=FileManager.get_media_type(
                destination
            ),
            processing_type=request.processing_type,
            original_filename=temp_file.name,
            stored_filename=destination.name,
            storage_path=str(destination),
            mime_type=FileManager.get_mime_type(
                destination
            ),
            file_size=destination.stat().st_size,
            uploaded_by=current_user.id,
            uploaded_at=datetime.now(
                ZoneInfo(
                    "Asia/Jakarta"
                )
            ).replace(
                tzinfo=None
            )
        )

        result = self.repository.create(
            db,
            entity
        )

        audit.log(
            db=db,
            request=http_request,
            current_user=current_user,
            module="Media",
            action="CREATE",
            entity="Media",
            entity_id=result.id,
            description=f"Media '{result.original_filename}' saved."
        )

        return result