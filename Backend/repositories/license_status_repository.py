from entities.license_status import LicenseStatus

from repositories.base_repository import BaseRepository

class LicenseStatusRepository(
    BaseRepository[LicenseStatus]
):

    def __init__(self):

        super().__init__(LicenseStatus)

    def get_by_id(
        self,
        db,
        status_id
    ):

        return (
            db.query(LicenseStatus)
            .filter(
                LicenseStatus.id == status_id
            )
            .first()
        )