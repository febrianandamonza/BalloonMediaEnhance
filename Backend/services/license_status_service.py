from services.base_service import BaseService

from repositories.license_status_repository import LicenseStatusRepository


class LicenseStatusService(
    BaseService[LicenseStatusRepository]
):

    def __init__(self):

        super().__init__(
            LicenseStatusRepository()
        )

    