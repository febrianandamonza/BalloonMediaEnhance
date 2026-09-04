from fastapi import APIRouter, Depends, HTTPException

# JWT di-hide sementara untuk endpoint stream (lihat start_stream/stop_stream)
# from dependencies.authentication import get_current_user
from services.network_stream_service import network_stream_service
from schemas.network_stream_schema import (
    StartStreamRequest,
    StartStreamResponse,
    StopStreamResponse,
)

router = APIRouter(
    prefix="/api/v1/network-stream",
    tags=["Network Stream"]
)


@router.post(
    "/start",
    response_model=StartStreamResponse
)
def start_stream(
    payload: StartStreamRequest,
    # current_user=Depends(get_current_user)
):

    if not network_stream_service.ffmpeg_available():

        raise HTTPException(
            status_code=500,
            detail="FFmpeg tidak ditemukan di server. Install FFmpeg dulu."
        )

    stream_id, playlist_url = network_stream_service.start_stream(
        payload.network_url
    )

    return StartStreamResponse(
        stream_id=stream_id,
        playlist_url=playlist_url
    )


@router.post(
    "/stop/{stream_id}",
    response_model=StopStreamResponse
)
def stop_stream(
    stream_id: str,
    # current_user=Depends(get_current_user)
):

    network_stream_service.stop_stream(stream_id)

    return StopStreamResponse(
        success=True,
        message="Stream dihentikan.",
        stream_id=stream_id
    )


@router.get("/health")
def health():

    return network_stream_service.health()
