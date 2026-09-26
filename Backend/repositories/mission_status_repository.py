from entities.mission_status import MissionStatus
from repositories.base_repository import BaseRepository

from sqlalchemy.orm import Session


class MissionStatusRepository(
    BaseRepository[MissionStatus]
):

    def __init__(self):

        super().__init__(MissionStatus)

    def get_by_name(
        self,
        db: Session,
        name: str
    ):

        return (
            db.query(MissionStatus)
            .filter(
                MissionStatus.name == name
            )
            .first()
        )