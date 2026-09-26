from entities.flight_simulation import FlightSimulation

from repositories.base_repository import BaseRepository


class FlightSimulationRepository(
    BaseRepository[FlightSimulation]
):

    def __init__(self):

        super().__init__(FlightSimulation)