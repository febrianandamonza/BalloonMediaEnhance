from pydantic import BaseModel
from pydantic import ConfigDict


class LicenseStatusResponse(BaseModel):
    
    id: int

    name: str

    description: str | None

    model_config = ConfigDict(
        from_attributes=True
    )