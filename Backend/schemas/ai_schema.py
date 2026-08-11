from pydantic import BaseModel


class AIProcessResponse(BaseModel):

    success: bool

    media_type: str

    processing_type: str

    temp_path: str

    preview_url: str

    processing_time: float