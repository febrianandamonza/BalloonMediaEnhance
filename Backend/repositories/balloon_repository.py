from sqlalchemy.orm import Session

from entities.balloon import Balloon

from repositories.base_repository import BaseRepository


class BalloonRepository(
    BaseRepository[Balloon]
):

    def __init__(self):

        super().__init__(Balloon)

    def get_by_serial_number(
        self,
        db: Session,
        serial_number: str
    ):

        return (
            db.query(Balloon)
            .filter(
                Balloon.serial_number == serial_number
            )
            .first()
        )