from typing import Dict, Any, Optional
from fastapi import APIRouter, Query, status
from ....models.schemas import EnvironmentalInventoryResponse
from ....services.environmental_service import environmental_service

router = APIRouter()


@router.get(
    "/inventory",
    response_model=EnvironmentalInventoryResponse,
    summary="List Environmental Datasets & Provenance",
    description=(
        "Returns the catalog of all verified environmental dataset sources (CPCB ground snapshot, "
        "Zenodo gridded 10 km NetCDF, Mendeley Sentinel-5P gases & ERA5 meteorology, and Zenodo model benchmark) "
        "including licenses, publication metadata, and SHA-256 integrity checksums."
    ),
)
async def get_inventory() -> EnvironmentalInventoryResponse:
    datasets = environmental_service.get_inventory()
    return EnvironmentalInventoryResponse(
        datasets=datasets,
        total_datasets=len(datasets),
        environment_provider="hybrid_in_memory_postgis",
    )


@router.get(
    "/ground-stations",
    summary="Query CPCB Statutory Ground Telemetry",
    description=(
        "Returns Central Pollution Control Board (CPCB) continuous ambient air quality monitoring "
        "station (CAAQMS) observations with strict NULL preservation for missing/calibration sensor readings, "
        "normalized ISO timestamps, and mapping to canonical RailAir corridor stations."
    ),
)
async def list_ground_stations(
    pollutant: Optional[str] = Query(
        None,
        description="Filter by pollutant parameter: PM2.5 | PM10 | NO2 | SO2 | CO | OZONE | NH3",
    ),
    city: Optional[str] = Query(
        None,
        description="Filter by city name (e.g. Delhi, Ghaziabad, Meerut)",
    ),
    corridor_only: bool = Query(
        True,
        description="If True, limits results to monitoring stations inside or adjacent to the Meerut–Delhi corridor",
    ),
    canonical_station_id: Optional[str] = Query(
        None,
        description="Filter stations within 25 km of a canonical railway station (e.g. MRT, MMU, MNR, GZB, SBB, DSA, NDLS)",
    ),
    quality_status: Optional[str] = Query(
        None,
        description="Filter by quality flag: valid | missing_na",
    ),
    limit: int = Query(50, ge=1, le=500, description="Pagination limit"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
) -> Dict[str, Any]:
    return environmental_service.get_ground_stations(
        pollutant=pollutant,
        city=city,
        corridor_only=corridor_only,
        canonical_station_id=canonical_station_id,
        quality_status=quality_status,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/gridded/corridor",
    summary="Query Historical Gridded Particulate Surface Estimates",
    description=(
        "Returns monthly 10 km gridded PM2.5 and PM10 surface concentrations (2017–2022) "
        "extracted from Zenodo Collection 2 for the Meerut–Ghaziabad–Delhi corridor."
    ),
)
async def get_gridded_corridor(
    pollutant: Optional[str] = Query(
        None,
        description="Pollutant filter: PM2.5 | PM10",
    ),
    year: Optional[int] = Query(
        None,
        ge=2017,
        le=2022,
        description="Filter by year (2017 to 2022)",
    ),
    month: Optional[int] = Query(
        None,
        ge=1,
        le=12,
        description="Filter by month (1 to 12)",
    ),
    grid_id: Optional[str] = Query(
        None,
        description="Filter by specific grid cell ID (e.g. grid_28.67_77.24)",
    ),
    min_lat: Optional[float] = Query(None, description="Bounding box minimum latitude"),
    max_lat: Optional[float] = Query(None, description="Bounding box maximum latitude"),
    min_lon: Optional[float] = Query(None, description="Bounding box minimum longitude"),
    max_lon: Optional[float] = Query(None, description="Bounding box maximum longitude"),
    limit: int = Query(50, ge=1, le=500, description="Pagination limit"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
) -> Dict[str, Any]:
    return environmental_service.get_gridded_corridor(
        pollutant=pollutant,
        year=year,
        month=month,
        grid_id=grid_id,
        min_lat=min_lat,
        max_lat=max_lat,
        min_lon=min_lon,
        max_lon=max_lon,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/meteorology",
    summary="Query Satellite Trace Gases and ERA5-Land Meteorology",
    description=(
        "Returns Sentinel-5P TROPOMI satellite trace gas column densities (CO, NO2, O3, SO2, HCHO in mol/m²) "
        "and ECMWF ERA5-Land reanalysis weather variables (Temperature, Dewpoint in K, Winds in m/s) from Mendeley Data."
    ),
)
async def get_meteorology(
    variable_name: Optional[str] = Query(
        None,
        description="Parameter name: CO | NO2 | O3 | SO2 | HCHO | Temperature | DewPoint | Wind_U | Wind_V",
    ),
    city: Optional[str] = Query(
        None,
        description="Filter by monitoring station city",
    ),
    corridor_only: bool = Query(
        True,
        description="Limit to stations in or adjacent to the RailAir corridor",
    ),
    year: Optional[int] = Query(
        None,
        ge=2023,
        le=2025,
        description="Filter by year (2023 to 2025)",
    ),
    month: Optional[int] = Query(
        None,
        ge=1,
        le=12,
        description="Filter by month (1 to 12)",
    ),
    limit: int = Query(50, ge=1, le=500, description="Pagination limit"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
) -> Dict[str, Any]:
    return environmental_service.get_meteorology(
        variable_name=variable_name,
        city=city,
        corridor_only=corridor_only,
        year=year,
        month=month,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/observations",
    summary="Unified Regional Environmental Observations Query",
    description=(
        "Queries environmental data across in-situ ground CAAQMS stations and gridded particulate estimates "
        "with spatial bounding box filters and dataset selection."
    ),
)
async def query_observations(
    pollutant: Optional[str] = Query(
        None,
        description="Filter by chemical or particulate parameter (e.g. PM2.5, PM10, NO2)",
    ),
    source_dataset: Optional[str] = Query(
        None,
        description="Filter by dataset ID: cpcb_snapshot_2026 | zenodo_gridded_pm_v2 | mendeley_trace_gases_era5",
    ),
    min_lat: Optional[float] = Query(None, description="Bounding box minimum latitude"),
    max_lat: Optional[float] = Query(None, description="Bounding box maximum latitude"),
    min_lon: Optional[float] = Query(None, description="Bounding box minimum longitude"),
    max_lon: Optional[float] = Query(None, description="Bounding box maximum longitude"),
    limit: int = Query(50, ge=1, le=500, description="Pagination limit"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
) -> Dict[str, Any]:
    # Route to ground or gridded service depending on source_dataset or query parameters
    if source_dataset == "zenodo_gridded_pm_v2":
        return environmental_service.get_gridded_corridor(
            pollutant=pollutant,
            min_lat=min_lat,
            max_lat=max_lat,
            min_lon=min_lon,
            max_lon=max_lon,
            limit=limit,
            offset=offset,
        )
    elif source_dataset == "mendeley_trace_gases_era5":
        return environmental_service.get_meteorology(
            variable_name=pollutant,
            limit=limit,
            offset=offset,
        )
    else:
        # Default to ground stations
        return environmental_service.get_ground_stations(
            pollutant=pollutant,
            corridor_only=(min_lat is None and max_lat is None),
            limit=limit,
            offset=offset,
        )
