from datetime import datetime
from uuid import uuid4

from fastapi import Request

from utils.audit_helper import audit

from entities.flight_mission import FlightMission

from repositories.flight_mission_repository import FlightMissionRepository
from repositories.flight_simulation_repository import FlightSimulationRepository
from repositories.location_repository import LocationRepository
from repositories.balloon_repository import BalloonRepository
from repositories.mission_status_repository import MissionStatusRepository

from services.base_service import BaseService

from utils.exceptions import (
    ConflictException,
    NotFoundException
)


class FlightMissionService(
    BaseService[FlightMissionRepository]
):

    def __init__(self):

        super().__init__(
            FlightMissionRepository()
        )

        self.simulation_repository = FlightSimulationRepository()

        self.location_repository = LocationRepository()

        self.balloon_repository = BalloonRepository()

        self.status_repository = MissionStatusRepository()

    def get_by_id(
        self,
        db,
        mission_id
    ):

        entity = super().get_by_id(
            db,
            mission_id
        )

        if entity is None:

            raise NotFoundException(
                "Flight Mission not found."
            )

        return entity

    def create(
        self,
        db,
        http_request: Request,
        request,
        current_user
    ):

        if not self.simulation_repository.get_by_id(
            db,
            request.simulation_id
        ):

            audit.log(

            db=db,

            request=http_request,

            current_user=current_user,

            module="Flight Mission",

            action="FAILED",

            entity="FlightMission",

            entity_id=None,

            description=f"Flight Mission failed. '{request.simulation_id}' not found "

        )

            raise NotFoundException(
                "Flight Simulation not found."
            )

        if request.location_id:

            if not self.location_repository.get_by_id(
                db,
                request.location_id
            ):

                audit.log(
                
                    db=db,
                    
                    request=http_request,
                    
                    current_user=current_user,
                    
                    module="Flight Mission",
                    
                    action="FAILED",
                    
                    entity="FlightMission",
                    
                    entity_id=None,
                    
                    description=f"Flight Mission failed. Location '{request.location_id}' not found"
                    
                )

                raise NotFoundException(
                    "Location not found."
                )

        if request.balloon_id:

            if not self.balloon_repository.get_by_id(
                db,
                request.balloon_id
            ):
                audit.log(
                
                    db=db,
                
                    request=http_request,
                
                    current_user=current_user,
                
                    module="Flight Mission",
                
                    action="FAILED",
                
                    entity="FlightMission",
                
                    entity_id=None,
                
                    description=f"Flight Mission failed. Ballon '{request.balloon_id}' not found"
                
                )

                raise NotFoundException(
                    "Balloon not found."
                )

        if request.status_id:

            if not self.status_repository.get_by_id(
                db,
                request.status_id
            ):

                audit.log(
                
                    db=db,
                
                    request=http_request,
                
                    current_user=current_user,
                
                    module="Flight Mission",
                
                    action="FAILED",
                
                    entity="FlightMission",
                
                    entity_id=None,
                
                    description=f"Flight Mission failed. Mission status '{request.status_id}' not found"
                
                )

                raise NotFoundException(
                    "Mission Status not found."
                )

        entity = FlightMission(

            id=uuid4(),

            simulation_id=request.simulation_id,

            mission_code=self.generate_mission_code(
                db
            ),

            mission_name=request.mission_name,

            description=request.description,

            location_id=request.location_id,

            balloon_id=request.balloon_id,

            status_id=request.status_id,

            created_by=current_user.id,

            created_at=datetime.utcnow()

        )

        result = super().create(
            db,
            entity
        )

        audit.log(

            db=db,

            request=http_request,

            current_user=current_user,

            module="Flight Mission",

            action="CREATE",

            entity="FlightMission",

            entity_id=result.id,

            description=f"Flight Mission '{result.mission_code}' created."

        )

        return result

    def update(
        self,
        db,
        mission_id,
        http_request: Request,
        current_user,
        request
    ):

        entity = self.get_by_id(
            db,
            mission_id
        )

        if not self.simulation_repository.get_by_id(
            db,
            request.simulation_id
        ):
            audit.log(
            
            db=db,
            
            request=http_request,
            
            current_user=current_user,
            
            module="Flight Mission",
            
            action="FAILED",
            
            entity="FlightMission",
            
            entity_id=None,
            
            description=f"Flight Mission failed. '{request.simulation_id}' not found "
            
            )

            raise NotFoundException(
                "Flight Simulation not found."
            )

        if request.location_id:

            if not self.location_repository.get_by_id(
                db,
                request.location_id
            ):
                audit.log(
                
                    db=db,
                
                    request=http_request,
                
                    current_user=current_user,
                
                    module="Flight Mission",
                
                    action="FAILED",
                
                    entity="FlightMission",
                
                    entity_id=None,
                
                    description=f"Flight Mission failed. Location '{request.location_id}' not found"
                
                )

                raise NotFoundException(
                    "Location not found."
                )

        if request.balloon_id:

            if not self.balloon_repository.get_by_id(
                db,
                request.balloon_id
            ):
                audit.log(
                
                    db=db,
                
                    request=http_request,
                
                    current_user=current_user,
                
                    module="Flight Mission",
                
                    action="FAILED",
                
                    entity="FlightMission",
                
                    entity_id=None,
                
                    description=f"Flight Mission failed. Ballon '{request.balloon_id}' not found"
                
                )

                audit.log(
                
                    db=db,
                
                    request=http_request,
                
                    current_user=current_user,
                
                    module="Flight Mission",
                
                    action="FAILED",
                
                    entity="FlightMission",
                
                    entity_id=None,
                
                    description=f"Flight Mission failed. Mission status '{request.status_id}' not found"
                
                )

                raise NotFoundException(
                    "Balloon not found."
                )

        if request.status_id:

            if not self.status_repository.get_by_id(
                db,
                request.status_id
            ):

                raise NotFoundException(
                    "Mission Status not found."
                )

        entity.simulation_id = request.simulation_id

        entity.mission_code = request.mission_code

        entity.mission_name = request.mission_name

        entity.description = request.description

        entity.location_id = request.location_id

        entity.balloon_id = request.balloon_id

        entity.status_id = request.status_id

        entity.updated_at = datetime.utcnow()

        result =  super().update(
            db,
            entity
        )

        audit.log(

            db=db,

            request=http_request,

            current_user=current_user,

            module="Flight Mission",

            action="UPDATE",

            entity="FlightMission",

            entity_id=result.id,

            description=f"Flight Mission '{result.mission_code}' updated."

        )

        return result

    def delete(
        self,
        db,
        mission_id,
        http_request: Request,
        current_user
    ):

        entity = self.get_by_id(
            db,
            mission_id
        )

        if entity is None:

            raise NotFoundException(
                "Flight Missiong not found."
            )

        mission_code = entity.mission_code

        result = super().delete(
            db,
            entity
        )

        audit.log(

            db=db,

            request=http_request,

            current_user=current_user,

            module="Flight Mission",

            action="DELETE",

            entity="FlightMission",

            entity_id=entity.id,

            description=f"Flight Mission '{mission_code}' deleted."

        )

        return result

    def generate_mission_code(
        self,
        db
    ):

        date_str = datetime.utcnow().strftime("%Y%m%d")

        last = self.repository.get_last_mission_by_date(
            db,
            date_str
        )

        if last is None:

            sequence = 1

        else:

            sequence = int(
                last.mission_code.split("-")[-1]
            ) + 1

        return f"MIS-{date_str}-{sequence:04d}"
