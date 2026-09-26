from datetime import datetime
from uuid import uuid4

from fastapi import Request

from utils.audit_helper import audit

from entities.flight_information import FlightInformation

from repositories.flight_information_repository import FlightInformationRepository
from repositories.flight_mission_repository import FlightMissionRepository

from services.base_service import BaseService

from utils.exceptions import (
    ConflictException,
    NotFoundException,
    BadRequestException
)


class FlightInformationService(
    BaseService[FlightInformationRepository]
):

    def __init__(self):

        super().__init__(
            FlightInformationRepository()
        )

        self.mission_repository = FlightMissionRepository()

    def get_by_id(
        self,
        db,
        information_id
    ):

        entity = super().get_by_id(
            db,
            information_id
        )

        if entity is None:

            raise NotFoundException(
                "Flight Information not found."
            )

        return entity

    def create(
        self,
        db,
        http_request: Request,
        request,
        current_user
    ):

        if not self.mission_repository.get_by_id(
            db,
            request.mission_id
        ):

            raise NotFoundException(
                "Flight Mission not found."
            )

        if self.repository.get_by_mission(
            db,
            request.mission_id
        ):

            raise ConflictException(
                "Flight Information already exists for this mission."
            )

        if (
            request.takeoff_time
            and request.landing_time
            and request.landing_time < request.takeoff_time
        ):

            raise BadRequestException(
                "Landing time must be greater than takeoff time."
            )

        entity = FlightInformation(

            id=uuid4(),

            mission_id=request.mission_id,

            mission_leader=request.mission_leader,

            takeoff_time=request.takeoff_time,

            landing_time=request.landing_time,

            duration=request.duration,

            max_altitude=request.max_altitude,

            cable_length=request.cable_length,

            weather=request.weather,

            remarks=request.remarks,

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

            module="Flight Information",

            action="CREATE",

            entity="FlightInformation",

            entity_id=result.id,

            description=f"Flight Information for Mission '{result.mission.mission_code}' created."

        )

        return result

    def update(
        self,
        db,
        information_id,
        http_request: Request,
        current_user,
        request
    ):

        entity = self.get_by_id(
            db,
            information_id
        )

        entity.mission_leader = request.mission_leader

        entity.takeoff_time = request.takeoff_time

        entity.landing_time = request.landing_time

        entity.duration = request.duration

        entity.max_altitude = request.max_altitude

        entity.cable_length = request.cable_length

        entity.weather = request.weather

        entity.remarks = request.remarks

        result = super().update(
            db,
            entity
        )

        audit.log(

            db=db,

            request=http_request,

            current_user=current_user,

            module="Flight Information",

            action="UPDATE",

            entity="FlightInformation",

            entity_id=result.id,

            description=f"Flight Information for Mission '{result.mission.mission_code}' updated."

        )

        return result

    def delete(
        self,
        db,
        information_id,
        http_request: Request,
        current_user
    ):

        entity = self.repository.get_by_id(
            db,
            information_id
        )

        if entity is None:

            raise NotFoundException(
                "Flight Information not found."
            )

        mission_code = entity.mission.mission_code

        result = super().delete(
            db,
            entity
        )

        audit.log(

            db=db,

            request=http_request,

            current_user=current_user,

            module="Flight Information",

            action="DELETE",

            entity="FlightInformation",

            entity_id=entity.id,

            description=f"Flight Information for Mission '{mission_code}' deleted."

        )

        return result