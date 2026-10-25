from fastapi import APIRouter
from .endpoints.health import router as health_router
from .endpoints.stations import router as stations_router
from .endpoints.corridor import router as corridor_router
from .endpoints.environmental import router as environmental_router

api_v1_router = APIRouter()

api_v1_router.include_router(health_router, tags=["Health"])
api_v1_router.include_router(stations_router, prefix="/stations", tags=["Stations"])
api_v1_router.include_router(corridor_router, prefix="/corridor", tags=["Corridor"])
api_v1_router.include_router(environmental_router, prefix="/environmental", tags=["Environmental"])
