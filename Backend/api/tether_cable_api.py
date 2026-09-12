from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session


from database.database import get_db

from schemas.tether_cable_api_schema import (
    TetherCableAPICreate,
    TetherCableAPIResponse
)

from services.tether_cable_api_service import (
    TetherCableAPIService
)


router = APIRouter(
    prefix="/api/v1/tether-cable-api",
    tags=["Tether Cable API"]
)

service = TetherCableAPIService()


@router.post(
    "/start",
    response_model=TetherCableAPIResponse,
    status_code=status.HTTP_201_CREATED
)
def start_stream(
    data: TetherCableAPICreate,
    db: Session = Depends(get_db)
):
    return service.start(
        db,
        data.udp_url
    )


@router.patch(
    "/{uid}/stop",
    response_model=TetherCableAPIResponse
)
def stop_stream(
    uid: UUID,
    db: Session = Depends(get_db)
):
    log = service.stop(db, uid)

    if not log:
        raise HTTPException(
            status_code=404,
            detail="Tether Cable API log not found"
        )

    return log


@router.get(
    "",
    response_model=list[TetherCableAPIResponse]
)
def get_all(
    db: Session = Depends(get_db)
):
    return service.get_all(db)


@router.get(
    "/{uid}",
    response_model=TetherCableAPIResponse
)
def get_by_uid(
    uid: UUID,
    db: Session = Depends(get_db)
):
    log = service.get_by_uid(db, uid)

    if not log:
        raise HTTPException(
            status_code=404,
            detail="Tether Cable API log not found"
        )

    return log