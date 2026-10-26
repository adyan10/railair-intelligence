from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Query, HTTPException, status
from ....models.schemas import (
    EnvironmentalInventoryResponse,
    EnvironmentalPeriodsResponse,
    EnvironmentalGridResponse,
    EnvironmentalTimeSeriesResponse,
    EnvironmentalHotspotsResponse,
    LocationInspectionResponse,
)
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
        description="Filter stations within 25 km of a canonical railway station (e.g. MRT, MMU, MNR, GZB, SAH, DSO, NDLS)",
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


# ==============================================================================
# Environmental Explorer & Command Centre Specialized Endpoints
# ==============================================================================

@router.get(
    "/variables",
    summary="List Available Environmental Variables & Supported Units",
    description="Returns metadata for environmental variables currently supported by the continuous regional gridded engine.",
)
async def get_variables() -> List[Dict[str, Any]]:
    return [
        {
            "variable": "PM2.5",
            "name": "Fine Particulate Matter (PM2.5)",
            "unit": "µg/m³",
            "source_dataset": "zenodo_gridded_pm_v2",
            "source_type": "modelled_surface_estimate",
            "temporal_coverage": "2017-01 to 2022-12 (72 months)",
            "spatial_resolution": "10km",
            "naaqs_annual_standard": 40.0,
            "naaqs_24h_standard": 60.0,
            "color_palette": "CPCB Standard (Green to Dark Maroon)",
        },
        {
            "variable": "PM10",
            "name": "Coarse Particulate Matter (PM10)",
            "unit": "µg/m³",
            "source_dataset": "zenodo_gridded_pm_v2",
            "source_type": "modelled_surface_estimate",
            "temporal_coverage": "2017-01 to 2022-12 (72 months)",
            "spatial_resolution": "10km",
            "naaqs_annual_standard": 60.0,
            "naaqs_24h_standard": 100.0,
            "color_palette": "CPCB Standard (Green to Dark Maroon)",
        },
    ]


@router.get(
    "/periods",
    response_model=EnvironmentalPeriodsResponse,
    summary="List Available Historical Time Periods",
    description="Returns strictly real, verified historical monthly periods available in Zenodo Collection 2 (2017-01 to 2022-12).",
)
async def get_periods(
    pollutant: str = Query("PM2.5", description="Pollutant: PM2.5 | PM10"),
) -> EnvironmentalPeriodsResponse:
    if pollutant.upper() not in ("PM2.5", "PM10"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported pollutant '{pollutant}'. Supported pollutants: PM2.5, PM10",
        )
    return environmental_service.get_available_periods(pollutant=pollutant)


@router.get(
    "/bounds",
    summary="Get Spatial Footprint and Grid Resolution",
    description="Returns geographic bounding box, coordinate reference system, and grid dimensions for the Delhi-NCR corridor.",
)
async def get_bounds() -> Dict[str, Any]:
    return environmental_service.get_spatial_bounds()


@router.get(
    "/grid",
    response_model=EnvironmentalGridResponse,
    summary="Get Gridded Pollution Layer for Selected Period",
    description="Delivers 64-cell contiguous 10 km grid with bounding polygons, values, and CPCB AQI classifications for map rendering.",
)
async def get_grid(
    pollutant: str = Query("PM2.5", description="Pollutant: PM2.5 | PM10"),
    year: int = Query(2022, ge=2017, le=2022, description="Year (2017–2022)"),
    month: int = Query(12, ge=1, le=12, description="Month (1–12)"),
) -> EnvironmentalGridResponse:
    if pollutant.upper() not in ("PM2.5", "PM10"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported pollutant '{pollutant}'. Supported: PM2.5, PM10",
        )
    return environmental_service.get_grid_for_period(pollutant=pollutant, year=year, month=month)


@router.get(
    "/timeseries",
    response_model=EnvironmentalTimeSeriesResponse,
    summary="Get Multi-Year Time Series for Location or Grid Cell",
    description="Returns 72-month chronological time series (2017–2022) with winter peaks and monsoon dips.",
)
async def get_timeseries(
    grid_id: Optional[str] = Query(None, description="Grid Cell ID (e.g. grid_28.67_77.24)"),
    lat: Optional[float] = Query(None, description="WGS84 Latitude"),
    lon: Optional[float] = Query(None, description="WGS84 Longitude"),
    pollutant: str = Query("PM2.5", description="Pollutant: PM2.5 | PM10"),
) -> EnvironmentalTimeSeriesResponse:
    return environmental_service.get_timeseries(grid_id=grid_id, lat=lat, lon=lon, pollutant=pollutant)


@router.get(
    "/summary",
    summary="Get Regional Summary Statistics for Period",
    description="Returns mean, median, min, max, standard deviation, and coverage indicators for the selected period.",
)
async def get_regional_summary(
    pollutant: str = Query("PM2.5", description="Pollutant: PM2.5 | PM10"),
    year: int = Query(2022, ge=2017, le=2022, description="Year (2017–2022)"),
    month: int = Query(12, ge=1, le=12, description="Month (1–12)"),
) -> Dict[str, Any]:
    grid_resp = environmental_service.get_grid_for_period(pollutant=pollutant, year=year, month=month)
    return {
        "dataset_id": grid_resp.dataset_id,
        "pollutant": grid_resp.pollutant,
        "unit": grid_resp.unit,
        "year": grid_resp.year,
        "month": grid_resp.month,
        "period": grid_resp.period,
        "summary": grid_resp.summary.model_dump(),
    }


@router.get(
    "/hotspots",
    response_model=EnvironmentalHotspotsResponse,
    summary="Get Ranked Pollution Hotspots for Period",
    description="Returns top regional grid cells ranked by pollutant concentration descending.",
)
async def get_hotspots(
    pollutant: str = Query("PM2.5", description="Pollutant: PM2.5 | PM10"),
    year: int = Query(2022, ge=2017, le=2022, description="Year (2017–2022)"),
    month: int = Query(12, ge=1, le=12, description="Month (1–12)"),
    limit: int = Query(10, ge=1, le=64, description="Top N hotspots to return"),
) -> EnvironmentalHotspotsResponse:
    return environmental_service.get_hotspot_ranking(pollutant=pollutant, year=year, month=month, limit=limit)


@router.get(
    "/inspect",
    response_model=LocationInspectionResponse,
    summary="Inspect Environmental Layer at Clicked Coordinate",
    description="Returns cell values, quality, nearest railway station, and historical time series for any coordinate inside the coverage area.",
)
async def inspect_location(
    lat: float = Query(..., ge=28.0, le=30.0, description="Latitude"),
    lon: float = Query(..., ge=76.5, le=78.5, description="Longitude"),
    pollutant: str = Query("PM2.5", description="Pollutant: PM2.5 | PM10"),
    year: int = Query(2022, ge=2017, le=2022, description="Year (2017–2022)"),
    month: int = Query(12, ge=1, le=12, description="Month (1–12)"),
) -> LocationInspectionResponse:
    try:
        return environmental_service.inspect_location(
            lat=lat,
            lon=lon,
            pollutant=pollutant,
            year=year,
            month=month,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get(
    "/corridor-comparison",
    summary="Compare Regional Grid Against 7 Canonical Railway Stations",
    description="Compares regional ambient grid values against the 7 canonical corridor stations (MRT, MMU, MNR, GZB, SAH, DSO, NDLS).",
)
async def get_corridor_comparison(
    pollutant: str = Query("PM2.5", description="Pollutant: PM2.5 | PM10"),
    year: int = Query(2022, ge=2017, le=2022, description="Year (2017–2022)"),
    month: int = Query(12, ge=1, le=12, description="Month (1–12)"),
) -> List[Dict[str, Any]]:
    return environmental_service.get_corridor_comparison(pollutant=pollutant, year=year, month=month)


@router.get(
    "/coverage",
    summary="Get Environmental Ingestion & Spatial Coverage Status",
    description="Returns data coverage indicators, missing data counts, and provenance information.",
)
async def get_coverage_status() -> Dict[str, Any]:
    summary = environmental_service.run_ingestion_summary()
    return {
        "status": "healthy",
        "primary_dataset": "zenodo_gridded_pm_v2",
        "spatial_footprint": "Meerut–Ghaziabad–Delhi (28.45°N–29.20°N, 77.10°E–77.90°E)",
        "temporal_range": "2017-01 to 2022-12 (72 monthly periods)",
        "resolution": "10km (64 continuous cells)",
        "metrics": summary,
    }
