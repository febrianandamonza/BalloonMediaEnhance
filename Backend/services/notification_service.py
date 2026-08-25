from services.base_service import BaseService

from repositories.notification_repository import NotificationRepository


class NotificationService(
    BaseService[NotificationRepository]
):

    def __init__(self):

        super().__init__(
            NotificationRepository()
        )


    def create(
        self,
        db,
        data
    ):

        return self.repository.create_notification(
            db=db,
            title=data.title,
            description=data.description,
            level=data.level,
            type=data.type,
            status=data.status,
            source=data.source,
            metadata=data.metadata
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