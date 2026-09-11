from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from database.database import get_db

from schemas.tether_cable_monitor_schema import (
    TetherCableMonitorCreate,
    TetherCableMonitorResponse
)

from services.tether_cable_monitor_service import (
    TetherCableMonitorService
)


router = APIRouter(
    prefix="/api/v1/tether-cable-monitor",
    tags=["Tether Cable Monitor"]
)

service = TetherCableMonitorService()


@router.post(
    "",
    response_model=TetherCableMonitorResponse,
    status_code=201
)
def create_tether_cable_monitor(
    data: TetherCableMonitorCreate,
    db: Session = Depends(get_db)
):

    return service.create(
        db,
        data
    )


@router.get(
    "",
    response_model=list[
        TetherCableMonitorResponse
    ]
)
def get_tether_cable_monitors(
    db: Session = Depends(get_db)
):

    return service.get_all(
        db
    )


@router.get(
    "/{monitor_id}",
    response_model=TetherCableMonitorResponse
)
def get_tether_cable_monitor(
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
            detail="Tether cable monitor not found"
        )

    return monitor