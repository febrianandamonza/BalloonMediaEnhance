from pydantic import BaseModel


class StartStreamRequest(BaseModel):

    network_url: str


class StartStreamResponse(BaseModel):

    stream_id: str

    playlist_url: str


class StopStreamResponse(BaseModel):

    success: bool

    message: str

    stream_id: str


class CrowdStreamRequest(BaseModel):

    network_url: str


class CrowdStreamJobResponse(BaseModel):

    success: bool

    job_id: str
