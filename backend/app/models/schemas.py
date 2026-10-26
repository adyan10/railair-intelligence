from typing import List, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict

DataKind = Literal["simulated", "measured", "modelled"]
PollutantType = Literal["PM2.5", "PM10", "NO2", "CO"]
ConfidenceLevel = Literal["high", "medium", "low", "very-low"]
StationType = Literal["major", "halt", "junction", "terminal"]


class LatLng(BaseModel):
    lat: float = Field(..., description="WGS84 Latitude")
    lng: float = Field(..., description="WGS84 Longitude")

    model_config = ConfigDict(populate_by_name=True)


class DataProvenance(BaseModel):
    source: str = Field(..., description="Origin of reading or calculation")
    timestamp: str = Field(..., description="ISO 8601 observation/calculation timestamp")
    data_kind: DataKind = Field(
        default="simulated",
        alias="dataKind",
        description="Explicit classification: simulated | measured | modelled",
    )
    confidence: ConfidenceLevel = Field(default="low", description="Quality confidence category")
    confidence_score: float = Field(
        default=0.25,
        alias="confidenceScore",
        ge=0.0,
        le=1.0,
        description="Confidence index between 0.0 and 1.0",
    )
    notes: Optional[str] = Field(None, description="Caveats or provenance details")

    model_config = ConfigDict(populate_by_name=True)


class PollutionObservation(BaseModel):
    id: str = Field(..., description="Unique observation ID, e.g. obs-MRT-pm25")
    station_id: str = Field(..., alias="stationId", description="Station code")
    pollutant: PollutantType = Field(..., description="Chemical particulate or gaseous pollutant")
    value: float = Field(..., ge=0.0, description="Concentration reading")
    unit: str = Field(default="µg/m³", description="Measurement unit")
    who_guideline: Optional[float] = Field(None, description="WHO standard threshold")
    naaqs_standard: Optional[float] = Field(None, description="Indian NAAQS baseline threshold")
    provenance: DataProvenance = Field(..., description="Observation data provenance")

    model_config = ConfigDict(populate_by_name=True)


class Station(BaseModel):
    id: str = Field(..., description="Station alphanumeric identifier (e.g. MRT, NDLS)")
    name: str = Field(..., description="Full official station name")
    short_name: str = Field(..., alias="shortName", description="Display short name")
    position: LatLng = Field(..., description="Geospatial coordinates")
    station_type: StationType = Field(..., alias="type", description="Operational railway station class")
    distance_from_origin_km: float = Field(
        ...,
        alias="distanceFromOriginKm",
        ge=0.0,
        description="Cumulative distance from corridor origin",
    )
    platforms: Optional[str] = Field(None, description="Platform infrastructure notes")
    sub: Optional[str] = Field(None, description="Division or railway operational sub-label")
    provenance: DataProvenance = Field(..., description="Station-level simulation metadata")
    observations: List[PollutionObservation] = Field(
        default_factory=list,
        description="Active pollutant readings at this node",
    )

    model_config = ConfigDict(populate_by_name=True)


class CorridorSegment(BaseModel):
    id: str = Field(..., description="Unique segment identifier, e.g. seg-MRT-MMU")
    from_station_id: str = Field(..., alias="fromStationId", description="Origin station ID")
    to_station_id: str = Field(..., alias="toStationId", description="Destination station ID")
    distance_km: float = Field(..., alias="distanceKm", ge=0.0, description="Segment distance in km")
    travel_time_minutes: int = Field(
        ...,
        alias="travelTimeMinutes",
        ge=0,
        description="Scheduled or estimated travel time in minutes",
    )
    path: List[LatLng] = Field(..., description="Illustrative track coordinates")
    pm25_estimate: float = Field(..., alias="pm25Estimate", ge=0.0, description="Synthetic PM2.5 estimate")
    pm10_estimate: float = Field(..., alias="pm10Estimate", ge=0.0, description="Synthetic PM10 estimate")
    provenance: DataProvenance = Field(..., description="Segment-level simulation metadata")

    model_config = ConfigDict(populate_by_name=True)


class Corridor(BaseModel):
    id: str = Field(..., description="Unique corridor identifier")
    name: str = Field(..., description="Corridor description")
    focus: str = Field(..., description="Key corridor alignment label")
    total_distance_km: float = Field(..., alias="totalDistanceKm", ge=0.0)
    total_nodes: int = Field(..., alias="totalNodes", ge=0)
    stations: List[str] = Field(..., description="Ordered list of station codes")
    segments: List[CorridorSegment] = Field(..., description="Constituent corridor segments")
    provenance: DataProvenance = Field(..., description="Corridor dataset provenance")

    model_config = ConfigDict(populate_by_name=True)


class DatabaseHealth(BaseModel):
    connected: bool = Field(..., description="Database connection health")
    mode: str = Field(..., description="Runtime data provider mode (postgres | standalone_synthetic)")
    detail: Optional[str] = Field(None, description="Status detail message")


class HealthResponse(BaseModel):
    status: str = Field(default="healthy", description="Overall service status")
    service: str = Field(..., description="Application name")
    version: str = Field(..., description="Application semantic version")
    environment: str = Field(..., description="Active environment (development | production)")
    database: DatabaseHealth = Field(..., description="Database connectivity state")


# ==============================================================================
# Environmental Ingestion & Observation Schemas
# ==============================================================================

class EnvironmentalDatasetInfo(BaseModel):
    id: str = Field(..., description="Dataset identifier")
    title: str = Field(..., description="Official dataset title")
    publisher: str = Field(..., description="Data provider or publishing organization")
    persistent_id: Optional[str] = Field(None, description="DOI, UUID, or citation identifier")
    version: str = Field(..., description="Dataset release version")
    license: str = Field(..., description="Data reuse license")
    source_filename: str = Field(..., description="Local source file name")
    sha256: str = Field(..., description="SHA-256 integrity checksum")
    spatial_coverage: str = Field(..., description="Geographical extent")
    temporal_coverage: str = Field(..., description="Date or time range")
    measurement_type: str = Field(..., description="Scientific measurement classification")
    record_count: int = Field(..., description="Total or subset record count")
    notes: Optional[str] = Field(None, description="Scientific provenance notes or caveats")

    model_config = ConfigDict(populate_by_name=True)


class GroundStationReading(BaseModel):
    id: str = Field(..., description="Observation ID")
    station_name: str = Field(..., description="Source CAAQMS station name")
    city: str = Field(..., description="Station city")
    state: str = Field(..., description="Station state")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="WGS84 latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="WGS84 longitude")
    pollutant: str = Field(..., description="Pollutant parameter (PM2.5, PM10, NO2, etc.)")
    value_avg: Optional[float] = Field(None, description="Average concentration (null if sensor NA)")
    value_min: Optional[float] = Field(None, description="Minimum concentration")
    value_max: Optional[float] = Field(None, description="Maximum concentration")
    unit: str = Field(..., description="Measurement unit (e.g. µg/m³)")
    observed_at: str = Field(..., description="ISO 8601 observation timestamp")
    acquisition_at: str = Field(..., description="ISO 8601 acquisition timestamp")
    quality_status: str = Field(..., description="Observation quality (valid | missing_na)")
    is_corridor: bool = Field(..., description="Whether station is within RailAir corridor")
    nearest_canonical_station_id: Optional[str] = Field(None, description="Mapped canonical corridor station ID")
    canonical_ir_code: Optional[str] = Field(None, description="Official Indian Railways CRIS code of nearest canonical station")
    distance_to_canonical_km: Optional[float] = Field(None, description="Distance to nearest canonical station in km")
    dataset_id: str = Field(..., description="Source dataset ID")

    model_config = ConfigDict(populate_by_name=True)


class GriddedCorridorEstimate(BaseModel):
    id: str = Field(..., description="Unique gridded record ID")
    grid_id: str = Field(..., description="Grid cell identifier")
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    pollutant: str = Field(..., description="Pollutant (PM2.5 or PM10)")
    value: Optional[float] = Field(None, description="Monthly mean concentration")
    unit: str = Field(default="µg/m³")
    year: int = Field(..., ge=2000, le=2100)
    month: int = Field(..., ge=1, le=12)
    observed_at: str = Field(..., description="ISO 8601 normalized monthly timestamp")
    observation_type: str = Field(default="gridded_surface_estimate")
    spatial_resolution: str = Field(default="10km")
    temporal_resolution: str = Field(default="monthly_mean")
    source_file: str = Field(...)

    model_config = ConfigDict(populate_by_name=True)


class MeteorologicalReading(BaseModel):
    id: str = Field(..., description="Reading ID")
    station_name: str = Field(..., description="Station or site name")
    city: str = Field(..., description="City")
    state: str = Field(..., description="State")
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    variable_name: str = Field(..., description="Parameter name (CO, NO2, Temperature, Wind_U, etc.)")
    value: Optional[float] = Field(None, description="Observed or reanalysis value")
    unit: str = Field(..., description="Scientific unit (mol/m², K, m/s)")
    measurement_type: str = Field(..., description="Derivation classification")
    observed_at: str = Field(..., description="ISO 8601 timestamp")
    year: int = Field(...)
    month: int = Field(...)

    model_config = ConfigDict(populate_by_name=True)


class EnvironmentalInventoryResponse(BaseModel):
    datasets: List[EnvironmentalDatasetInfo]
    total_datasets: int
    environment_provider: str = Field(default="hybrid_in_memory_postgis")


# ==============================================================================
# Environmental Explorer & Command Centre API Schemas
# ==============================================================================

class EnvironmentalPeriod(BaseModel):
    period: str = Field(..., description="Format: YYYY-MM")
    year: int = Field(..., ge=2000, le=2100)
    month: int = Field(..., ge=1, le=12)
    label: str = Field(..., description="Human readable label, e.g. 'Jan 2017'")
    timestamp: str = Field(..., description="ISO 8601 normalized timestamp")

    model_config = ConfigDict(populate_by_name=True)


class EnvironmentalPeriodsResponse(BaseModel):
    dataset_id: str
    pollutant: str
    total_periods: int
    periods: List[EnvironmentalPeriod]

    model_config = ConfigDict(populate_by_name=True)


class GridCellBounds(BaseModel):
    south: float
    west: float
    north: float
    east: float

    model_config = ConfigDict(populate_by_name=True)


class GridCellRecord(BaseModel):
    grid_id: str
    latitude: float
    longitude: float
    bounds: GridCellBounds
    value: Optional[float]
    unit: str = "µg/m³"
    category: str
    color: str
    nearest_station: Optional[str] = None
    distance_to_station_km: Optional[float] = None

    model_config = ConfigDict(populate_by_name=True)


class RegionalSummary(BaseModel):
    mean: float
    median: float
    min: float
    max: float
    std_dev: float
    valid_cells: int
    total_cells: int
    no_data_cells: int
    coverage_pct: float
    unit: str = "µg/m³"
    cpcb_dominant_category: str

    model_config = ConfigDict(populate_by_name=True)


class EnvironmentalGridResponse(BaseModel):
    dataset_id: str
    pollutant: str
    unit: str
    year: int
    month: int
    period: str
    total_cells: int
    summary: RegionalSummary
    cells: List[GridCellRecord]
    data_provider: Optional[str] = Field(None, description="Active data provider: postgres_postgis | in_memory_synthetic")

    model_config = ConfigDict(populate_by_name=True)


class TimeSeriesPoint(BaseModel):
    period: str
    year: int
    month: int
    value: Optional[float]
    unit: str
    category: str

    model_config = ConfigDict(populate_by_name=True)


class EnvironmentalTimeSeriesResponse(BaseModel):
    dataset_id: str
    pollutant: str
    unit: str
    grid_id: str
    latitude: float
    longitude: float
    total_points: int
    timeseries: List[TimeSeriesPoint]
    overall_mean: float
    overall_min: float
    overall_max: float
    winter_peak_mean: float
    monsoon_dip_mean: float
    data_provider: Optional[str] = Field(None, description="Active data provider: postgres_postgis | in_memory_synthetic")

    model_config = ConfigDict(populate_by_name=True)


class HotspotRankItem(BaseModel):
    rank: int
    grid_id: str
    latitude: float
    longitude: float
    value: float
    unit: str
    category: str
    color: str
    nearest_canonical_station_id: Optional[str]
    distance_to_canonical_km: Optional[float]

    model_config = ConfigDict(populate_by_name=True)


class EnvironmentalHotspotsResponse(BaseModel):
    dataset_id: str
    pollutant: str
    unit: str
    year: int
    month: int
    period: str
    total_hotspots: int
    items: List[HotspotRankItem]
    data_provider: Optional[str] = Field(None, description="Active data provider: postgres_postgis | in_memory_synthetic")

    model_config = ConfigDict(populate_by_name=True)


class LocationInspectionResponse(BaseModel):
    dataset_id: str
    pollutant: str
    unit: str
    period: str
    query_latitude: float
    query_longitude: float
    grid_id: str
    cell_latitude: float
    cell_longitude: float
    cell_bounds: GridCellBounds
    value: Optional[float]
    category: str
    color: str
    distance_to_query_km: float
    nearest_station: Optional[str]
    distance_to_station_km: Optional[float]
    timeseries: List[TimeSeriesPoint]

    model_config = ConfigDict(populate_by_name=True)
