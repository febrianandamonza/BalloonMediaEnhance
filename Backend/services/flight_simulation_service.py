from datetime import datetime
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi import Request

from entities.flight_simulation import FlightSimulation

from utils.audit_helper import audit

from repositories.flight_simulation_repository import FlightSimulationRepository
from repositories.user_repository import UserRepository

from utils.exceptions import (
    NotFoundException,
    ConflictException
)


class FlightSimulationService:

    def __init__(self):

        self.repository = FlightSimulationRepository()

        self.user_repository = UserRepository()

    def get_all(
        self,
        db
    ):

        return self.repository.get_all(db)

    def get_by_id(
        self,
        db,
        simulation_id
    ):

        entity = self.repository.get_by_id(
            db,
            simulation_id
        )

        if entity is None:

            raise NotFoundException(
                "Flight Simulation not found."
            )

        return entity

    def create(
        self,
        db,
        http_request : Request,
        request,
        current_user
    ):

        entity = FlightSimulation(

            id=uuid4(),

            simulation_name=request.simulation_name,

            payload_weight=request.payload_weight,

            helium_volume=request.helium_volume,

            flight_altitude=request.flight_altitude,

            estimated_duration=request.estimated_duration,

            wind_speed=request.wind_speed,

            gust_speed=request.gust_speed,

            visibility=request.visibility,

            rainfall=request.rainfall,

            temperature=request.temperature,

            go_no_go=request.go_no_go,

            remarks=request.remarks,

            created_by=current_user.id,

            created_at=datetime.now(
                ZoneInfo("Asia/Jakarta")
            ).replace(tzinfo=None)

        )

        result =  self.repository.create(
            db,
            entity
        )

        audit.log(

            db=db,

            request=http_request,

            current_user=current_user,

            module="Flight Simulation",

            action="CREATE",

            entity="FlightSimulation",

            entity_id=result.id,

            description=f"Created Flight Simulation '{result.simulation_name}'."

        )

        return result

    def update(
        self,
        db,
        simulation_id,
        http_request: Request,
        current_user,
        request
    ):

        entity = self.repository.get_by_id(
            db,
            simulation_id
        )

        if entity is None:

            raise NotFoundException(
                "Flight Simulation not found."
            )

        entity.simulation_name = request.simulation_name

        entity.payload_weight = request.payload_weight

        entity.helium_volume = request.helium_volume

        entity.flight_altitude = request.flight_altitude

        entity.estimated_duration = request.estimated_duration

        entity.wind_speed = request.wind_speed

        entity.gust_speed = request.gust_speed

        entity.visibility = request.visibility

        entity.rainfall = request.rainfall

        entity.temperature = request.temperature

        entity.go_no_go = request.go_no_go

        entity.remarks = request.remarks

        result = self.repository.update(
            db,
            entity
        )

        audit.log(

            db=db,

            request=http_request,

            current_user=current_user,

            module="Flight Simulation",

            action="UPDATE",

            entity="FlightSimulation",

            entity_id=result.id,

            description=f"Updated Flight Simulation '{result.simulation_name}'."

        )

        return result

    def delete(
        self,
        db,
        simulation_id,
        http_request: Request,
        current_user
    ):

        entity = self.repository.get_by_id(
            db,
            simulation_id
        )

        
        if entity is None:

            raise NotFoundException(
                "Flight Simulation not found."
            )

        simulation_name = entity.simulation_name

        self.repository.delete(
            db,
            entity
        )

        audit.log(

            db=db,

            request=http_request,

            current_user=current_user,

            module="Flight Simulation",

            action="DELETE",

            entity="FlightSimulation",

            entity_id=entity.id,

            description=f"Deleted Flight Simulation '{simulation_name}'."

        )