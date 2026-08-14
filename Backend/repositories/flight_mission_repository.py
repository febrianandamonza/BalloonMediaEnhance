from entities.flight_mission import FlightMission
from entities.mission_status import MissionStatus

from repositories.base_repository import BaseRepository

from sqlalchemy import desc
from sqlalchemy.orm import Session, joinedload


class FlightMissionRepository(
    BaseRepository[FlightMission]
):

    def __init__(self):

        super().__init__(FlightMission)

    def get_all(
            self,
            db: Session
    ):
        return (
            db.query(FlightMission)
            .options(
                joinedload(FlightMission.mission_status),
                joinedload(FlightMission.location),
                joinedload(FlightMission.balloon)
            )
            .all()
        )
        

    def get_last_mission(
        self,
        db: Session
    ):

        return (
            db.query(FlightMission)
            .order_by(
                desc(FlightMission.created_at)
            )
            .first()
        )

    def get_last_mission_by_date(
        self,
        db: Session,
        date_str: str
    ):

        return (
            db.query(FlightMission)
            .filter(
                FlightMission.mission_code.like(
                    f"MIS-{date_str}-%"
                )
            )
            .order_by(
                desc(FlightMission.mission_code)
            )
            .first()
        )

    