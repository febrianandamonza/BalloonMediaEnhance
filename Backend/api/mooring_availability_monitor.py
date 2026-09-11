from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from database.database import get_db

from schemas.mooring_availability_monitor_schema import (
    MooringAvailabilityMonitorCreate,
    MooringAvailabilityMonitorResponse
)

from services.mooring_availability_monitor_service import (
    MooringAvailabilityMonitorService
)


router = APIRouter(
    prefix="/api/v1/mooring-availability-monitor",
    tags=["Mooring Availability Monitor"]
)

service = MooringAvailabilityMonitorService()


@router.post(
    "",
    response_model=MooringAvailabilityMonitorResponse,
    status_code=201
)
def create_mooring_availability_monitor(
    data: MooringAvailabilityMonitorCreate,
    db: Session = Depends(get_db)
):

    return service.create(
        db,
        data
    )


@router.get(
    "",
    response_model=list[
        MooringAvailabilityMonitorResponse
    ]
)
def get_mooring_availability_monitors(
    db: Session = Depends(get_db)
):

    return service.get_all(
        db
    )


@router.get(
    "/{monitor_id}",
    response_model=MooringAvailabilityMonitorResponse
)
def get_mooring_availability_monitor(
    monitor_id: UUID,
    db: Session = Depends(get_db)
):

    monitor = service.get_by_id(
        db,
        monitor_id
    )

    if monitor is None:

        raise HTTPException(
            status_code=404,
            detail="Mooring availability monitor not found"
        )

    return monitor