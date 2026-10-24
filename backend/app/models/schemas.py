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
