from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from database.database import get_db

from schemas.dashboard_schema import (
    DashboardSimulationResponse
)

from services.dashboard_service import (
    DashboardService
)


router = APIRouter(
    prefix="/api/v1/dashboard",
    tags=["Dashboard"]
)

service = DashboardService()


@router.get(
    "/simulations",
    response_model=list[
        DashboardSimulationResponse
    ]
)
def get_dashboard_simulations(
    db: Session = Depends(get_db)
):

    return service.get_simulations(
        db
    )


@router.get(
    "/simulations/{simulation_id}",
    response_model=DashboardSimulationResponse
)
def get_dashboard_simulation(
    simulation_id: UUID,
    db: Session = Depends(get_db)
):

    simulation = service.get_simulation_by_id(
        db,
        simulation_id
    )

    if simulation is None:

        raise HTTPException(
            status_code=404,
            detail="Flight simulation not found"
        )

    return simulation