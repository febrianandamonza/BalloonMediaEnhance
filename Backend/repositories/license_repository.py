from sqlalchemy.orm import Session

from entities.license import License

from repositories.base_repository import BaseRepository


class LicenseRepository(
    BaseRepository[License]
):

    def __init__(self):

        super().__init__(License)

    def get_by_id(
        self,
        db: Session,
        license_id
    ):

        return (
            db.query(License)
            .filter(License.id == license_id)
            .first()
        )

    def get_by_code(
        self,
        db: Session,
        code: str
    ):

        return (
            db.query(License)
            .filter(License.license_code == code)
            .first()
        )

    def update(
        self,
        db: Session,
        entity: License
    ):

        db.commit()
        db.refresh(entity)

        return entity