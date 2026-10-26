from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from ....models.schemas import Station, StationType, PollutantType
from ....services.station_service import station_service

router = APIRouter()


@router.get(
    "",
    response_model=List[Station],
    summary="List Railway Station Nodes",
    description="Returns all monitored railway stations with geospatial positions, current synthetic observations, and simulation provenance.",
)
async def list_stations(
    station_type: Optional[StationType] = Query(
        None,
        alias="type",
        description="Filter stations by railway class: major | halt | junction | terminal",
    ),
    pollutant: Optional[PollutantType] = Query(
        None,
        description="Filter stations having observations for a specific pollutant: PM2.5 | PM10 | NO2 | CO",
    ),
) -> List[Station]:
    return station_service.get_all_stations(station_type=station_type, pollutant=pollutant)


@router.get(
    "/{station_id}",
    response_model=Station,
    summary="Get Station by ID",
    description="Returns detailed station metadata, geographic coordinates, platforms, and pollution observations for a specific station code.",
    responses={
        status.HTTP_404_NOT_FOUND: {
            "description": "Station not found",
            "content": {"application/json": {"example": {"detail": "Station 'XYZ' not found"}}},
        }
    },
)
async def get_station(station_id: str) -> Station:
    station = station_service.get_station_by_id(station_id)
    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Station '{station_id}' not found",
        )
    return station
