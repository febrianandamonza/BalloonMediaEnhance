from decimal import Decimal

from pydantic import BaseModel
from pydantic import ConfigDict

class LocationSimpleResponse(BaseModel):

    name: str

    city: str

    province: str

    latitude: Decimal

    longitude: Decimal

    model_config = ConfigDict(
        from_attributes=True
    )


class LocationCreateRequest(BaseModel):

    name: str

    city: str

    province: str

    latitude: Decimal

    longitude: Decimal


class LocationUpdateRequest(BaseModel):

    name: str

    city: str

    province: str

    latitude: Decimal

    longitude: Decimal


class LocationResponse(BaseModel):

    id: int

    name: str

    city: str

    province: str

    latitude: Decimal

    longitude: Decimal

    model_config = ConfigDict(
        from_attributes=True
    )