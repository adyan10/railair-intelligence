from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .api.v1.router import api_v1_router


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description=(
            "Geospatial particulate intelligence and atmospheric exposure API "
            "for national railway corridors. Baseline synthetic data for prototype validation."
        ),
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url=f"{settings.API_V1_STR}/docs",
        redoc_url=f"{settings.API_V1_STR}/redoc",
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount API v1 router
    app.include_router(api_v1_router, prefix=settings.API_V1_STR)

    @app.get("/", tags=["Root"])
    async def root():
        return {
            "name": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "docs": f"{settings.API_V1_STR}/docs",
            "health": f"{settings.API_V1_STR}/health",
            "provenanceNotice": "Simulated baseline dataset for prototype validation. Not connected to active CPCB instrumentation.",
        }

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
