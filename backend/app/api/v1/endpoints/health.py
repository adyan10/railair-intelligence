from fastapi import APIRouter
from ....config import settings
from ....models.schemas import HealthResponse, DatabaseHealth
from ....db.session import check_db_connectivity

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service Health Status",
    description="Returns backend uptime, version, environment, and database connectivity mode.",
)
async def get_health() -> HealthResponse:
    db_status = check_db_connectivity()
    return HealthResponse(
        status="healthy",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        database=DatabaseHealth(
            connected=db_status["connected"],
            mode=db_status["mode"],
            detail=db_status.get("detail"),
        ),
    )
