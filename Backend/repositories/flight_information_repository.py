from sqlalchemy.orm import Session

from entities.flight_information import FlightInformation

from repositories.base_repository import BaseRepository


class FlightInformationRepository(
    BaseRepository[FlightInformation]
):

    def __init__(self):

        super().__init__(
            FlightInformation
        )

    def get_by_mission(
        self,
        db: Session,
        mission_id
    ):

        return (
            db.query(FlightInformation)
            .filter(
                FlightInformation.mission_id == mission_id
            )
            .first()
        )