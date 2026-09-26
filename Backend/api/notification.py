from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from database.database import get_db

from services.notification_service import NotificationService

from schemas.notification_schema import (
    NotificationResponse,
    NotificationCreate
                                         )


router = APIRouter(
    prefix="/api/v1/notifications",
    tags=["Notifications"]
)

service = NotificationService()


@router.post(
    "",
    response_model=NotificationResponse,
    status_code=201
)
def create_notification(
    data: NotificationCreate,
    db: Session = Depends(get_db)
):

    return service.create(
        db,
        data
    )


@router.get(
    "",
    response_model=list[NotificationResponse]
)
def get_notifications(
    db: Session = Depends(get_db)
):

    return service.get_all(db)


@router.get(
    "/unread",
    response_model=list[NotificationResponse]
)
def get_unread_notifications(
    db: Session = Depends(get_db)
):

    return service.get_unread(db)


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse
)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db)
):

    notification = service.mark_as_read(
        db,
        notification_id
    )

    if notification is None:

        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    return notification


@router.patch(
    "/read-all"
)
def mark_all_notifications_as_read(
    db: Session = Depends(get_db)
):

    count = service.mark_all_as_read(db)

    return {
        "success": True,
        "updated": count
    }


@router.patch(
    "/{notification_id}/close",
    response_model=NotificationResponse
)
def close_notification(
    notification_id: int,
    db: Session = Depends(get_db)
):

    notification = service.close(
        db,
        notification_id
    )

    if notification is None:

        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    return notification