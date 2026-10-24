from fastapi import APIRouter
from ....models.schemas import Corridor
from ....services.station_service import station_service

router = APIRouter()


@router.get(
    "",
    response_model=Corridor,
    summary="Get Primary Monitored Corridor",
    description="Returns full corridor definition including route distance, ordered station alignment, segment track geometry, and synthetic particulate estimates.",
)
async def get_corridor() -> Corridor:
    return station_service.get_corridor()
