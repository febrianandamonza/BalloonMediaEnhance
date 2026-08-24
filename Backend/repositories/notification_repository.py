from datetime import datetime

from entities.notification import Notification

from repositories.base_repository import BaseRepository


class NotificationRepository(
    BaseRepository[Notification]
):

    def __init__(self):

        super().__init__(
            Notification
        )

    def get_all(self, db):

        return (
            db.query(Notification)
            .order_by(
                Notification.createdAt.desc()
            )
            .all()
        )

    def get_unread(self, db):

        return (
            db.query(Notification)
            .filter(
                Notification.isRead == False
            )
            .order_by(
                Notification.createdAt.desc()
            )
            .all()
        )

    def mark_as_read(
        self,
        db,
        notification_id
    ):

        notification = (
            db.query(Notification)
            .filter(
                Notification.id == notification_id
            )
            .first()
        )

        if notification is None:
            return None

        notification.isRead = True
        notification.updatedAt = datetime.utcnow()

        db.commit()
        db.refresh(notification)

        return notification

    def mark_all_as_read(self, db):

        notifications = (
            db.query(Notification)
            .filter(
                Notification.isRead == False
            )
            .all()
        )

        now = datetime.utcnow()

        for notification in notifications:

            notification.isRead = True
            notification.updatedAt = now

        db.commit()

        return len(notifications)

    def close(
        self,
        db,
        notification_id
    ):

        notification = (
            db.query(Notification)
            .filter(
                Notification.id == notification_id
            )
            .first()
        )

        if notification is None:
            return None

        notification.status = "ditutup"
        notification.updatedAt = datetime.utcnow()

        db.commit()
        db.refresh(notification)

        return notification