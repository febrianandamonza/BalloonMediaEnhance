from sqlalchemy.orm import Session

from entities.user_license import UserLicense

from repositories.base_repository import BaseRepository


class UserLicenseRepository(BaseRepository[UserLicense]):

    def __init__(self):

        super().__init__(UserLicense)

    def delete(
        self,
        db: Session,
        entity
    ):

        db.delete(entity)

        db.commit()

    def get_by_id(
        self,
        db: Session,
        user_license_id
    ):

        return (
            db.query(UserLicense)
            .filter(UserLicense.id == user_license_id)
            .first()
        )

    def get_by_user(
        self,
        db: Session,
        user_id
    ):

        return (
            db.query(UserLicense)
            .filter(UserLicense.user_id == user_id)
            .all()
        )

    def exists(
        self,
        db: Session,
        user_id,
        license_id
    ):

        return (
            db.query(UserLicense)
            .filter(
                UserLicense.user_id == user_id,
                UserLicense.license_id == license_id
            )
            .first()
        )

    def update(
        self,
        db: Session,
        entity
    ):

        db.commit()
        db.refresh(entity)

        return entity


    