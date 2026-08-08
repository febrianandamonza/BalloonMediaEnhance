from sqlalchemy.orm import Session

from entities.location import Location

from repositories.base_repository import BaseRepository


class LocationRepository(
    BaseRepository[Location]
):

    def __init__(self):

        super().__init__(Location)

    def get_by_name(
        self,
        db: Session,
        name: str
    ):

        return (
            db.query(Location)
            .filter(
                Location.name == name
            )
            .first()
        )