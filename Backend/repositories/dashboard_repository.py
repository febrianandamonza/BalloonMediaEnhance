from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload

from entities.flight_simulation import FlightSimulation
from entities.flight_mission import FlightMission
from entities.flight_information import FlightInformation


class DashboardRepository:

    def get_simulations(
        self,
        db: Session
    ):

        return (
            db.query(FlightSimulation)
            .options(

                # =========================
                # Missions -> Mission Status
                # =========================

                selectinload(
                    FlightSimulation.missions
                ).selectinload(
                    FlightMission.mission_status
                ),

                # =========================
                # Missions -> Location
                # =========================

                selectinload(
                    FlightSimulation.missions
                ).selectinload(
                    FlightMission.location
                ),

                # =========================
                # Missions -> Balloon
                # =========================

                selectinload(
                    FlightSimulation.missions
                ).selectinload(
                    FlightMission.balloon
                ),

                # =========================
                # Missions -> Flight Information
                #                    -> Media
                # =========================

                selectinload(
                    FlightSimulation.missions
                )
                .selectinload(
                    FlightMission.flight_information
                )
                .selectinload(
                    FlightInformation.media
                )
            )
            .order_by(
                FlightSimulation.created_at.desc()
            )
            .all()
        )

    def get_simulation_by_id(
        self,
        db: Session,
        simulation_id: UUID
    ):

        return (
            db.query(FlightSimulation)
            .options(

                selectinload(
                    FlightSimulation.missions
                ).selectinload(
                    FlightMission.mission_status
                ),

                selectinload(
                    FlightSimulation.missions
                ).selectinload(
                    FlightMission.location
                ),

                selectinload(
                    FlightSimulation.missions
                ).selectinload(
                    FlightMission.balloon
                ),

                selectinload(
                    FlightSimulation.missions
                )
                .selectinload(
                    FlightMission.flight_information
                )
                .selectinload(
                    FlightInformation.media
                )
            )
            .filter(
                FlightSimulation.id == simulation_id
            )
            .first()
        )