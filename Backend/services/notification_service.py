from services.base_service import BaseService

from repositories.notification_repository import NotificationRepository


class NotificationService(
    BaseService[NotificationRepository]
):

    def __init__(self):

        super().__init__(
            NotificationRepository()
        )

    def get_all(self, db):

        return self.repository.get_all(db)

    def get_unread(self, db):

        return self.repository.get_unread(db)

    def mark_as_read(
        self,
        db,
        notification_id
    ):

        return self.repository.mark_as_read(
            db,
            notification_id
        )

    def mark_all_as_read(self, db):

        return self.repository.mark_all_as_read(
            db
        )

    def close(
        self,
        db,
        notification_id
    ):

        return self.repository.close(
            db,
            notification_id
        )