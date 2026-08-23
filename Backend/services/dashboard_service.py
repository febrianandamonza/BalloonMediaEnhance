from uuid import UUID

from sqlalchemy.orm import Session

from repositories.dashboard_repository import DashboardRepository


class DashboardService:

    def __init__(self):

        self.repository = DashboardRepository()

    def get_simulations(
        self,
        db: Session
    ):

        return self.repository.get_simulations(
            db
        )

    def get_simulation_by_id(
        self,
        db: Session,
        simulation_id: UUID
    ):

        return self.repository.get_simulation_by_id(
            db,
            simulation_id
        )