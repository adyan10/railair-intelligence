from .health import router as health_router
from .stations import router as stations_router
from .corridor import router as corridor_router

__all__ = ["health_router", "stations_router", "corridor_router"]
