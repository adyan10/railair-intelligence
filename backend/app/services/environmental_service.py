"""
RailAir Intelligence — Environmental Data Service & Ingestion Engine.

Provides unified, robust, read-only ingestion and query interfaces for:
1. Data.gov.in CPCB CAAQMS real-time statutory ground snapshot.
2. Zenodo Collection 2 (zeonodo-data2) 10 km gridded PM2.5 and PM10 (2017–2022).
3. Mendeley Data Sentinel-5P satellite column densities & ERA5-Land meteorology.
4. Zenodo Collection 1 machine learning benchmark model metadata.

Preserves data provenance, scientific distinctions (ground concentration vs satellite column
density vs reanalysis vs model estimate), and maps nearest canonical railway stations.
"""

import csv
import hashlib
import json
import logging
import math
import re
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

logger = logging.getLogger(__name__)

from ..models.schemas import (
    EnvironmentalDatasetInfo,
    GroundStationReading,
    GriddedCorridorEstimate,
    MeteorologicalReading,
    EnvironmentalPeriod,
    EnvironmentalPeriodsResponse,
    GridCellBounds,
    GridCellRecord,
    RegionalSummary,
    EnvironmentalGridResponse,
    TimeSeriesPoint,
    EnvironmentalTimeSeriesResponse,
    HotspotRankItem,
    EnvironmentalHotspotsResponse,
    LocationInspectionResponse,
)

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent.parent
RESOURCES_DIR = WORKSPACE_ROOT / "backend-resources"
DATA_GOV_DIR = RESOURCES_DIR / "data-gov-in"
ZENODO2_DIR = RESOURCES_DIR / "zeonodo-data2"
MENDELEY_DIR = RESOURCES_DIR / "mendeley-pollution-data"
ZENODO1_DIR = RESOURCES_DIR / "zenodo-data"
DERIVED_DIR = RESOURCES_DIR / "environmental-derived"

# Canonical RailAir Corridor Stations (WGS84 Coordinates)
CANONICAL_STATIONS = [
    {"id": "MRT", "ir_code": "MTC", "name": "Meerut City Junction", "lat": 28.9845, "lng": 77.7064, "city": "Meerut"},
    {"id": "MMU", "ir_code": "MDNR", "name": "Modinagar", "lat": 28.8324, "lng": 77.5803, "city": "Modinagar"},
    {"id": "MNR", "ir_code": "MUD", "name": "Muradnagar", "lat": 28.7772, "lng": 77.5028, "city": "Muradnagar"},
    {"id": "GZB", "ir_code": "GZB", "name": "Ghaziabad Junction", "lat": 28.6656, "lng": 77.4312, "city": "Ghaziabad"},
    {"id": "SAH", "ir_code": "SBB", "name": "Sahibabad Junction", "lat": 28.6728, "lng": 77.3625, "city": "Sahibabad"},
    {"id": "DSO", "ir_code": "DSA", "name": "Delhi Shahdara Junction", "lat": 28.6722, "lng": 77.2947, "city": "Delhi"},
    {"id": "NDLS", "ir_code": "NDLS", "name": "New Delhi", "lat": 28.6429, "lng": 77.2195, "city": "Delhi"},
]

CORRIDOR_CITIES = {"delhi", "ghaziabad", "meerut", "noida", "greater noida", "modinagar", "muradnagar"}
CORRIDOR_BBOX = {"min_lat": 28.45, "max_lat": 29.25, "min_lon": 77.05, "max_lon": 77.95}


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two points in km."""
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def compute_sha256(path: Path) -> str:
    """Computes SHA-256 digest of a local file."""
    if not path.exists():
        return ""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def classify_aqi_category(pollutant: str, value: Optional[float]) -> Tuple[str, str]:
    """Returns (category_name, hex_color) aligned with Indian CPCB AQI standards."""
    if value is None:
        return "No Data", "#94A3B8"
    p = pollutant.upper()
    if p == "PM2.5":
        if value <= 30.0:
            return "Good", "#10B981"
        elif value <= 60.0:
            return "Satisfactory", "#84CC16"
        elif value <= 90.0:
            return "Moderate", "#EAB308"
        elif value <= 120.0:
            return "Poor", "#F97316"
        elif value <= 250.0:
            return "Very Poor", "#EF4444"
        else:
            return "Severe", "#7F1D1D"
    elif p == "PM10":
        if value <= 50.0:
            return "Good", "#10B981"
        elif value <= 100.0:
            return "Satisfactory", "#84CC16"
        elif value <= 250.0:
            return "Moderate", "#EAB308"
        elif value <= 350.0:
            return "Poor", "#F97316"
        elif value <= 430.0:
            return "Very Poor", "#EF4444"
        else:
            return "Severe", "#7F1D1D"
    else:
        return "Standard", "#64748B"


# Documented continuous color ramp thresholds for high spatial discrimination
PM25_CONTINUOUS_RAMP = [
    (0.0, (16, 185, 129)),     # #10B981 Emerald (Good)
    (30.0, (132, 204, 22)),    # #84CC16 Lime (Satisfactory)
    (60.0, (245, 158, 11)),    # #F59E0B Amber (Moderate)
    (90.0, (249, 115, 22)),    # #F97316 Orange (Poor)
    (120.0, (239, 68, 68)),    # #EF4444 Coral Red (Very Poor lower bound)
    (150.0, (219, 39, 119)),   # #DB2777 Rose / Magenta
    (180.0, (147, 51, 234)),   # #9333EA Violet / Purple
    (250.0, (88, 28, 135)),    # #581C87 Deep Plum (Severe)
]

PM10_CONTINUOUS_RAMP = [
    (0.0, (16, 185, 129)),     # #10B981 Emerald (Good)
    (50.0, (132, 204, 22)),    # #84CC16 Lime (Satisfactory)
    (100.0, (245, 158, 11)),   # #F59E0B Amber (Moderate)
    (175.0, (249, 115, 22)),   # #F97316 Orange (Poor)
    (250.0, (239, 68, 68)),    # #EF4444 Coral Red (Very Poor)
    (300.0, (219, 39, 119)),   # #DB2777 Rose / Magenta
    (350.0, (147, 51, 234)),   # #9333EA Violet / Purple
    (430.0, (88, 28, 135)),    # #581C87 Deep Plum (Severe)
    (500.0, (59, 7, 100)),     # #3B0764 Dark Maroon (Hazardous)
]


def interpolate_ramp_color_hex(pollutant: str, value: Optional[float]) -> str:
    """Calculates continuous hex color corresponding to exact concentration on documented scale."""
    if value is None:
        return "#94A3B8"
    p = pollutant.strip().upper()
    ramp = PM25_CONTINUOUS_RAMP if p == "PM2.5" else PM10_CONTINUOUS_RAMP
    if value <= ramp[0][0]:
        r, g, b = ramp[0][1]
        return f"#{r:02x}{g:02x}{b:02x}"
    if value >= ramp[-1][0]:
        r, g, b = ramp[-1][1]
        return f"#{r:02x}{g:02x}{b:02x}"
    for i in range(len(ramp) - 1):
        t0, (r0, g0, b0) = ramp[i]
        t1, (r1, g1, b1) = ramp[i + 1]
        if t0 <= value <= t1:
            t = (value - t0) / (t1 - t0)
            r = round(r0 + t * (r1 - r0))
            g = round(g0 + t * (g1 - g0))
            b = round(b0 + t * (b1 - b0))
            return f"#{r:02x}{g:02x}{b:02x}"
    r, g, b = ramp[-1][1]
    return f"#{r:02x}{g:02x}{b:02x}"



class EnvironmentalService:
    def __init__(self) -> None:
        self._ground_readings: Optional[List[GroundStationReading]] = None
        self._gridded_estimates: Optional[List[GriddedCorridorEstimate]] = None
        self._meteorology_readings: Optional[List[MeteorologicalReading]] = None
        self._datasets_cache: Optional[List[EnvironmentalDatasetInfo]] = None

    # ==========================================================================
    # 1. Dataset Inventory & Provenance
    # ==========================================================================
    def get_inventory(self) -> List[EnvironmentalDatasetInfo]:
        """Returns catalog of verified environmental dataset sources."""
        if self._datasets_cache is not None:
            return self._datasets_cache

        cpcb_file = DATA_GOV_DIR / "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69.csv"
        mendeley_file = MENDELEY_DIR / "MASTER DATASET 2023-25.csv"
        zenodo2_ref = ZENODO2_DIR / "pm25_arr_10km_2017_monthly.nc"
        zenodo1_file = ZENODO1_DIR / "pm25-full_rel-2026-07-r0_s-1.0_mb-1.3-r0.nc"

        datasets = [
            EnvironmentalDatasetInfo(
                id="cpcb_snapshot_2026",
                title="Real-Time Ambient Air Quality Data across India (CAAQMS)",
                publisher="Central Pollution Control Board (CPCB) via Data.gov.in",
                persistent_id="3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69",
                version="2026-10-25-snapshot",
                license="Government Open Data License - India (GODL)",
                source_filename=cpcb_file.name if cpcb_file.exists() else "",
                sha256=compute_sha256(cpcb_file),
                spatial_coverage="National India (530 stations, 52 corridor monitors)",
                temporal_coverage="2026-10-25 03:00:00 (Hourly Telemetry Snapshot)",
                measurement_type="in_situ_ground",
                record_count=3710,
                notes=(
                    "Direct in-situ regulatory CAAQMS monitors for PM2.5, PM10, NO2, SO2, CO, OZONE, NH3. "
                    "23.93% missing values (NA) reflect statutory field calibration zero-drift cycles."
                ),
            ),
            EnvironmentalDatasetInfo(
                id="zenodo_gridded_pm_v2",
                title="Monthly High-Resolution (10 km) Gridded PM2.5 and PM10 Surface Concentrations over India (2017–2022)",
                publisher="Zenodo Open Science Repository",
                persistent_id="10.5281/zenodo.zeonodo-data2",
                version="2.0",
                license="Creative Commons Attribution 4.0 International (CC-BY 4.0)",
                source_filename="pm25_arr_10km_<year>_monthly.nc & pm10_arr_10km_<year>_monthly.nc",
                sha256=compute_sha256(zenodo2_ref),
                spatial_coverage="National India (WGS84 5°N–40°N, 60°E–100°E; 10 km grid)",
                temporal_coverage="2017-01 to 2022-12 (72 continuous monthly time slices)",
                measurement_type="gridded_surface_estimate",
                record_count=9216,  # Targeted corridor extraction
                notes=(
                    "Continuous multi-year surface particulate baseline derived from satellite AOD, "
                    "chemical transport modeling, and CPCB ground calibration. Corridor subset extracted cleanly."
                ),
            ),
            EnvironmentalDatasetInfo(
                id="mendeley_trace_gases_era5",
                title="Master Dataset 2023-25: Multi-Pollutant and Meteorological Variables for Indian Stations",
                publisher="Mendeley Data",
                persistent_id="10.17632/mendeley-pollution-data",
                version="1.0",
                license="Creative Commons Attribution 4.0 International (CC-BY 4.0)",
                source_filename=mendeley_file.name if mendeley_file.exists() else "",
                sha256=compute_sha256(mendeley_file),
                spatial_coverage="495 CAAQMS coordinates across India",
                temporal_coverage="2023-01 to 2025-12 (36 monthly steps)",
                measurement_type="satellite_column_and_reanalysis",
                record_count=17681,
                notes=(
                    "Contains NO particulate matter (PM2.5/PM10 = 0). Provides Sentinel-5P TROPOMI column "
                    "densities (CO, NO2, O3, SO2, HCHO in mol/m²) and ERA5-Land weather (Temperature, Dewpoint, Winds)."
                ),
            ),
            EnvironmentalDatasetInfo(
                id="zenodo_pm25_ml_benchmark",
                title="Machine-Learning High-Resolution PM2.5 Surface Estimate over India (Release 2026-07)",
                publisher="Zenodo Open Science Repository",
                persistent_id="10.5281/zenodo.zenodo-data",
                version="2026-07-r0_s-1.0_mb-1.3-r0",
                license="Creative Commons Attribution 4.0 International (CC-BY 4.0)",
                source_filename=zenodo1_file.name if zenodo1_file.exists() else "",
                sha256=compute_sha256(zenodo1_file),
                spatial_coverage="Survey of India Lambert Conic Conformal (EPSG:7755)",
                temporal_coverage="Benchmark validation period",
                measurement_type="model_estimate_benchmark",
                record_count=1,
                notes=(
                    "318.9 MB NetCDF-4/HDF5 raster model benchmark. Cross-validation R² = 0.60805, RMSE = 26.55 µg/m³. "
                    "Maintained as reference model without bulk unindexed CSV expansion."
                ),
            ),
        ]
        self._datasets_cache = datasets
        return datasets

    # ==========================================================================
    # 2. CPCB Ground Station Telemetry Ingestion
    # ==========================================================================
    def _load_ground_readings(self) -> List[GroundStationReading]:
        """Loads and normalizes CPCB CAAQMS ground snapshot records."""
        if self._ground_readings is not None:
            return self._ground_readings

        csv_file = DATA_GOV_DIR / "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69.csv"
        if not csv_file.exists():
            self._ground_readings = []
            return []

        readings: List[GroundStationReading] = []
        with open(csv_file, "r", encoding="utf-8-sig", errors="replace") as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader):
                try:
                    lat = float(row.get("latitude") or 0.0)
                    lon = float(row.get("longitude") or 0.0)
                except ValueError:
                    continue

                if lat == 0.0 or lon == 0.0 or not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
                    continue

                station_raw = (row.get("station") or "").strip()
                city = (row.get("city") or "").strip()
                state = (row.get("state") or "").strip()
                pollutant = (row.get("pollutant_id") or "").strip().upper()

                # Normalization of timestamp: '25-10-2026 03:00:00' -> '2026-10-25T03:00:00+05:30'
                raw_time = (row.get("last_update") or "").strip()
                iso_time = "2026-10-25T03:00:00+05:30"
                if raw_time:
                    match = re.match(r"(\d{2})-(\d{2})-(\d{4})\s+(\d{2}:\d{2}:\d{2})", raw_time)
                    if match:
                        d, m, y, t = match.groups()
                        iso_time = f"{y}-{m}-{d}T{t}+05:30"

                # Parse numeric values; "NA" or empty must be null, never 0.0
                def parse_val(k: str) -> Optional[float]:
                    v = (row.get(k) or "").strip().upper()
                    if not v or v in ("NA", "NULL", "NAN", "-"):
                        return None
                    try:
                        return round(float(v), 2)
                    except ValueError:
                        return None

                val_avg = parse_val("pollutant_avg")
                val_min = parse_val("pollutant_min")
                val_max = parse_val("pollutant_max")

                quality = "missing_na" if val_avg is None else "valid"

                # Determine unit based on pollutant
                unit = "mg/m³" if pollutant == "CO" else "µg/m³"

                # Match nearest canonical station
                nearest_station: Optional[str] = None
                nearest_dist: Optional[float] = None
                for st in CANONICAL_STATIONS:
                    dist = haversine_distance_km(lat, lon, st["lat"], st["lng"])
                    if nearest_dist is None or dist < nearest_dist:
                        nearest_dist = round(dist, 2)
                        nearest_station = st["id"]

                # Is this monitor relevant to the RailAir corridor?
                in_bbox = (
                    CORRIDOR_BBOX["min_lat"] <= lat <= CORRIDOR_BBOX["max_lat"]
                    and CORRIDOR_BBOX["min_lon"] <= lon <= CORRIDOR_BBOX["max_lon"]
                )
                city_match = city.lower() in CORRIDOR_CITIES
                is_corridor = in_bbox or city_match

                safe_station_id = re.sub(r"[^a-zA-Z0-9]+", "_", f"{city}_{station_raw}_{pollutant}")[:80].lower()
                rec = GroundStationReading(
                    id=f"cpcb_{safe_station_id}_{idx}",
                    station_name=station_raw,
                    city=city,
                    state=state,
                    latitude=round(lat, 6),
                    longitude=round(lon, 6),
                    pollutant=pollutant,
                    value_avg=val_avg,
                    value_min=val_min,
                    value_max=val_max,
                    unit=unit,
                    observed_at=iso_time,
                    acquisition_at="2026-10-25T03:00:00+05:30",
                    quality_status=quality,
                    is_corridor=is_corridor,
                    nearest_canonical_station_id=nearest_station if (nearest_dist is not None and nearest_dist <= 25.0) else None,
                    distance_to_canonical_km=nearest_dist if (nearest_dist is not None and nearest_dist <= 25.0) else None,
                    dataset_id="cpcb_snapshot_2026",
                )
                readings.append(rec)

        self._ground_readings = readings
        return readings

    def get_ground_stations(
        self,
        pollutant: Optional[str] = None,
        city: Optional[str] = None,
        corridor_only: bool = True,
        canonical_station_id: Optional[str] = None,
        quality_status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """Queries CPCB ground stations with bounding/corridor filters and pagination."""
        all_readings = self._load_ground_readings()
        filtered = all_readings

        if corridor_only:
            filtered = [r for r in filtered if r.is_corridor]

        if pollutant:
            p_upper = pollutant.strip().upper()
            filtered = [r for r in filtered if r.pollutant == p_upper]

        if city:
            c_lower = city.strip().lower()
            filtered = [r for r in filtered if r.city.lower() == c_lower]

        if canonical_station_id:
            st_upper = canonical_station_id.strip().upper()
            filtered = [r for r in filtered if r.nearest_canonical_station_id == st_upper]

        if quality_status:
            filtered = [r for r in filtered if r.quality_status == quality_status]

        total = len(filtered)
        paginated = filtered[offset : offset + limit]

        return {
            "total": total,
            "returned": len(paginated),
            "limit": limit,
            "offset": offset,
            "filters": {
                "pollutant": pollutant,
                "city": city,
                "corridor_only": corridor_only,
                "canonical_station_id": canonical_station_id,
                "quality_status": quality_status,
            },
            "items": [r.model_dump(by_alias=True) for r in paginated],
        }

    # ==========================================================================
    # 3. Gridded Corridor NetCDF Ingestion
    # ==========================================================================
    def _load_gridded_estimates(self) -> List[GriddedCorridorEstimate]:
        """Loads targeted corridor PM2.5 and PM10 monthly estimates (2017–2022)."""
        if self._gridded_estimates is not None:
            return self._gridded_estimates

        target_file = DERIVED_DIR / "corridor_pm_monthly_2017_2022.json"
        if not target_file.exists():
            logger.warning(
                "Derived gridded estimates file not found at %s. "
                "Ensure offline extraction has been executed via "
                "backend-resources/environmental-derived/extract_corridor_netcdf.py.",
                target_file,
            )
            self._gridded_estimates = []
            return []

        try:
            with open(target_file, "r", encoding="utf-8") as f:
                raw_records = json.load(f)
        except Exception as e:
            logger.error("Failed to read gridded corridor estimates from %s: %s", target_file, e)
            self._gridded_estimates = []
            return []

        estimates = []
        for r in raw_records:
            estimates.append(
                GriddedCorridorEstimate(
                    id=r["id"],
                    grid_id=r["grid_id"],
                    latitude=r["latitude"],
                    longitude=r["longitude"],
                    pollutant=r["pollutant"],
                    value=r.get("value"),
                    unit=r.get("unit", "µg/m³"),
                    year=r["year"],
                    month=r["month"],
                    observed_at=r["observed_at"],
                    observation_type=r.get("observation_type", "gridded_surface_estimate"),
                    spatial_resolution=r.get("spatial_resolution", "10km"),
                    temporal_resolution=r.get("temporal_resolution", "monthly_mean"),
                    source_file=r.get("source_file", ""),
                )
            )

        self._gridded_estimates = estimates
        return estimates

    def get_gridded_corridor(
        self,
        pollutant: Optional[str] = None,
        year: Optional[int] = None,
        month: Optional[int] = None,
        grid_id: Optional[str] = None,
        min_lat: Optional[float] = None,
        max_lat: Optional[float] = None,
        min_lon: Optional[float] = None,
        max_lon: Optional[float] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """Queries historical 10 km gridded PM2.5 and PM10 surface estimates."""
        all_est = self._load_gridded_estimates()
        filtered = all_est

        if pollutant:
            p_upper = pollutant.strip().upper()
            filtered = [e for e in filtered if e.pollutant == p_upper]

        if year is not None:
            filtered = [e for e in filtered if e.year == year]

        if month is not None:
            filtered = [e for e in filtered if e.month == month]

        if grid_id:
            filtered = [e for e in filtered if e.grid_id == grid_id]

        if min_lat is not None:
            filtered = [e for e in filtered if e.latitude >= min_lat]
        if max_lat is not None:
            filtered = [e for e in filtered if e.latitude <= max_lat]
        if min_lon is not None:
            filtered = [e for e in filtered if e.longitude >= min_lon]
        if max_lon is not None:
            filtered = [e for e in filtered if e.longitude <= max_lon]

        total = len(filtered)
        paginated = filtered[offset : offset + limit]

        return {
            "total": total,
            "returned": len(paginated),
            "limit": limit,
            "offset": offset,
            "filters": {
                "pollutant": pollutant,
                "year": year,
                "month": month,
                "grid_id": grid_id,
                "bbox": {"min_lat": min_lat, "max_lat": max_lat, "min_lon": min_lon, "max_lon": max_lon},
            },
            "items": [e.model_dump(by_alias=True) for e in paginated],
        }

    # ==========================================================================
    # 4. Mendeley Atmospheric Gases & Meteorology Ingestion
    # ==========================================================================
    def _load_meteorology_readings(self) -> List[MeteorologicalReading]:
        """Loads and filters Mendeley satellite gases and ERA5-Land weather parameters."""
        if self._meteorology_readings is not None:
            return self._meteorology_readings

        csv_file = MENDELEY_DIR / "MASTER DATASET 2023-25.csv"
        if not csv_file.exists():
            self._meteorology_readings = []
            return []

        readings: List[MeteorologicalReading] = []
        with open(csv_file, "r", encoding="utf-8-sig", errors="replace") as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader):
                # Extract lat/lon from .geo JSON string
                geo_raw = row.get(".geo") or ""
                lat, lon = 0.0, 0.0
                if geo_raw:
                    try:
                        geo_dict = json.loads(geo_raw)
                        coords = geo_dict.get("coordinates", [0.0, 0.0])
                        lon, lat = float(coords[0]), float(coords[1])
                    except Exception:
                        continue

                if lat == 0.0 or lon == 0.0:
                    continue

                station = (row.get("station") or "").strip()
                city = (row.get("city") or "").strip()
                state = (row.get("state") or "").strip()
                month = int(row.get("Month") or 1)
                year = int(row.get("Year") or 2023)
                date_str = (row.get("Date") or f"01-{month:02d}-{year}").strip()

                # Normalization: '01-01-2023' -> '2023-01-01T00:00:00Z'
                iso_date = f"{year}-{month:02d}-01T00:00:00Z"
                m_match = re.match(r"(\d{2})-(\d{2})-(\d{4})", date_str)
                if m_match:
                    d, m, y = m_match.groups()
                    iso_date = f"{y}-{m}-{d}T00:00:00Z"

                # Define variable mappings with scientific units and derivation types
                var_specs = [
                    # Satellite Column Densities (Sentinel-5P TROPOMI)
                    ("CO", "mol/m²", "satellite_column"),
                    ("NO2", "mol/m²", "satellite_column"),
                    ("O3", "mol/m²", "satellite_column"),
                    ("SO2", "mol/m²", "satellite_column"),
                    ("HCHO", "mol/m²", "satellite_column"),
                    # ECMWF ERA5-Land Reanalysis Meteorology
                    ("Temperature", "K", "reanalysis_meteorology"),
                    ("DewPoint", "K", "reanalysis_meteorology"),
                    ("Wind_U", "m/s", "reanalysis_meteorology"),
                    ("Wind_V", "m/s", "reanalysis_meteorology"),
                ]

                for var_name, unit, m_type in var_specs:
                    val_raw = row.get(var_name)
                    if val_raw is not None and val_raw != "":
                        try:
                            f_val = float(val_raw)
                        except ValueError:
                            continue

                        safe_id = re.sub(r"[^a-zA-Z0-9]+", "_", f"{city}_{station}_{var_name}_{year}_{month}").lower()
                        readings.append(
                            MeteorologicalReading(
                                id=f"met_{safe_id}_{idx}",
                                station_name=station,
                                city=city,
                                state=state,
                                latitude=round(lat, 6),
                                longitude=round(lon, 6),
                                variable_name=var_name,
                                value=round(f_val, 6),
                                unit=unit,
                                measurement_type=m_type,
                                observed_at=iso_date,
                                year=year,
                                month=month,
                            )
                        )

        self._meteorology_readings = readings
        return readings

    def get_meteorology(
        self,
        variable_name: Optional[str] = None,
        city: Optional[str] = None,
        corridor_only: bool = True,
        year: Optional[int] = None,
        month: Optional[int] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """Queries satellite trace gases and ERA5-Land meteorology."""
        all_readings = self._load_meteorology_readings()
        filtered = all_readings

        if corridor_only:
            filtered = [
                r
                for r in filtered
                if r.city.lower() in CORRIDOR_CITIES
                or (
                    CORRIDOR_BBOX["min_lat"] <= r.latitude <= CORRIDOR_BBOX["max_lat"]
                    and CORRIDOR_BBOX["min_lon"] <= r.longitude <= CORRIDOR_BBOX["max_lon"]
                )
            ]

        if variable_name:
            v_clean = variable_name.strip()
            filtered = [r for r in filtered if r.variable_name.lower() == v_clean.lower()]

        if city:
            c_lower = city.strip().lower()
            filtered = [r for r in filtered if r.city.lower() == c_lower]

        if year is not None:
            filtered = [r for r in filtered if r.year == year]

        if month is not None:
            filtered = [r for r in filtered if r.month == month]

        total = len(filtered)
        paginated = filtered[offset : offset + limit]

        return {
            "total": total,
            "returned": len(paginated),
            "limit": limit,
            "offset": offset,
            "filters": {
                "variable_name": variable_name,
                "city": city,
                "corridor_only": corridor_only,
                "year": year,
                "month": month,
            },
            "items": [r.model_dump(by_alias=True) for r in paginated],
        }

    # ==========================================================================
    # 5. Ingestion Verification & Dry-Run Report
    # ==========================================================================
    def run_ingestion_summary(self) -> Dict[str, Any]:
        """Generates rigorous ingestion audit verification metrics."""
        ground_recs = self._load_ground_readings()
        gridded_recs = self._load_gridded_estimates()
        met_recs = self._load_meteorology_readings()
        inventory = self.get_inventory()

        # Count ground missing values
        null_count = sum(1 for r in ground_recs if r.value_avg is None)
        valid_count = len(ground_recs) - null_count
        corridor_ground_count = sum(1 for r in ground_recs if r.is_corridor)

        # Unique stations
        unique_ground_stations = len(set(r.station_name for r in ground_recs))
        corridor_ground_stations = len(
            set(r.station_name for r in ground_recs if r.is_corridor)
        )

        return {
            "inventory_datasets_count": len(inventory),
            "ground_observations": {
                "total_rows_parsed": len(ground_recs),
                "valid_values": valid_count,
                "null_values_preserved": null_count,
                "null_percentage": round((null_count / max(1, len(ground_recs))) * 100, 2),
                "unique_cpcb_stations": unique_ground_stations,
                "corridor_stations_count": corridor_ground_stations,
                "corridor_readings_count": corridor_ground_count,
            },
            "gridded_corridor_estimates": {
                "total_cells_extracted": len(gridded_recs),
                "pm25_count": sum(1 for e in gridded_recs if e.pollutant == "PM2.5"),
                "pm10_count": sum(1 for e in gridded_recs if e.pollutant == "PM10"),
                "years_covered": sorted(list(set(e.year for e in gridded_recs))),
            },
            "meteorology_and_gases": {
                "total_variables_parsed": len(met_recs),
                "variables": sorted(list(set(r.variable_name for r in met_recs))),
                "years_covered": sorted(list(set(r.year for r in met_recs))),
            },
        }

    # ==========================================================================
    # 6. Environmental Explorer & Command Centre Specialized Engines
    # ==========================================================================
    def get_available_periods(self, pollutant: str = "PM2.5") -> EnvironmentalPeriodsResponse:
        """Returns ordered list of real, historical monthly time slices in Zenodo Collection 2."""
        p_upper = pollutant.strip().upper()
        if p_upper not in ("PM2.5", "PM10"):
            p_upper = "PM2.5"

        all_est = self._load_gridded_estimates()
        slices = sorted(list(set((e.year, e.month) for e in all_est if e.pollutant == p_upper)))

        month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        periods: List[EnvironmentalPeriod] = []
        for y, m in slices:
            p_str = f"{y}-{m:02d}"
            label = f"{month_names[m - 1]} {y}"
            ts = f"{y}-{m:02d}-01T00:00:00Z"
            periods.append(EnvironmentalPeriod(period=p_str, year=y, month=m, label=label, timestamp=ts))

        return EnvironmentalPeriodsResponse(
            dataset_id="zenodo_gridded_pm_v2",
            pollutant=p_upper,
            total_periods=len(periods),
            periods=periods,
        )

    def get_spatial_bounds(self) -> Dict[str, Any]:
        """Returns exact spatial bounding box and grid specification for Delhi-NCR corridor."""
        return {
            "dataset_id": "zenodo_gridded_pm_v2",
            "crs": "EPSG:4326 (WGS84)",
            "bounds": {
                "min_lat": 28.45,
                "max_lat": 29.20,
                "min_lon": 77.10,
                "max_lon": 77.90,
            },
            "grid_shape": {
                "lat_count": 8,
                "lon_count": 8,
                "total_cells": 64,
            },
            "spatial_resolution": "10km",
            "temporal_coverage": {
                "start": "2017-01",
                "end": "2022-12",
                "total_months": 72,
            },
            "canonical_corridor": {
                "stations": ["MRT", "MMU", "MNR", "GZB", "SAH", "DSO", "NDLS"],
                "route_length_km": 83.0,
            },
        }

    def get_grid_for_period(
        self,
        pollutant: str = "PM2.5",
        year: int = 2022,
        month: int = 12,
    ) -> EnvironmentalGridResponse:
        """Returns 64-cell contiguous 10 km grid with bounding polygons and AQI color scale."""
        p_upper = pollutant.strip().upper()
        if p_upper not in ("PM2.5", "PM10"):
            p_upper = "PM2.5"

        all_est = self._load_gridded_estimates()
        matching = [e for e in all_est if e.pollutant == p_upper and e.year == year and e.month == month]

        if not matching:
            year, month = 2022, 12
            matching = [e for e in all_est if e.pollutant == p_upper and e.year == year and e.month == month]

        HALF_LAT = 0.05015
        HALF_LON = 0.050125

        cells: List[GridCellRecord] = []
        values: List[float] = []

        for e in matching:
            val = e.value
            cat, _ = classify_aqi_category(p_upper, val)
            col = interpolate_ramp_color_hex(p_upper, val)
            if val is not None:
                values.append(val)

            nearest_st: Optional[str] = None
            min_dist: Optional[float] = None
            for st in CANONICAL_STATIONS:
                d = haversine_distance_km(e.latitude, e.longitude, st["lat"], st["lng"])
                if min_dist is None or d < min_dist:
                    min_dist = round(d, 2)
                    nearest_st = st["id"]

            bounds = GridCellBounds(
                south=round(e.latitude - HALF_LAT, 6),
                west=round(e.longitude - HALF_LON, 6),
                north=round(e.latitude + HALF_LAT, 6),
                east=round(e.longitude + HALF_LON, 6),
            )

            cells.append(
                GridCellRecord(
                    grid_id=e.grid_id,
                    latitude=e.latitude,
                    longitude=e.longitude,
                    bounds=bounds,
                    value=val,
                    unit=e.unit,
                    category=cat,
                    color=col,
                    nearest_station=nearest_st,
                    distance_to_station_km=min_dist,
                )
            )

        valid_cells = len(values)
        total_cells = len(cells)
        no_data_cells = total_cells - valid_cells

        if valid_cells > 0:
            mean_val = round(sum(values) / valid_cells, 2)
            sorted_vals = sorted(values)
            median_val = round(
                (sorted_vals[valid_cells // 2] if valid_cells % 2 != 0 else (sorted_vals[valid_cells // 2 - 1] + sorted_vals[valid_cells // 2]) / 2),
                2,
            )
            min_val = round(min(values), 2)
            max_val = round(max(values), 2)
            variance = sum((x - mean_val) ** 2 for x in values) / valid_cells
            std_dev = round(math.sqrt(variance), 2)
            dom_cat, _ = classify_aqi_category(p_upper, mean_val)
        else:
            mean_val, median_val, min_val, max_val, std_dev = 0.0, 0.0, 0.0, 0.0, 0.0
            dom_cat = "No Data"

        summary = RegionalSummary(
            mean=mean_val,
            median=median_val,
            min=min_val,
            max=max_val,
            std_dev=std_dev,
            valid_cells=valid_cells,
            total_cells=total_cells,
            no_data_cells=no_data_cells,
            coverage_pct=round((valid_cells / max(1, total_cells)) * 100.0, 1),
            unit="µg/m³",
            cpcb_dominant_category=dom_cat,
        )

        return EnvironmentalGridResponse(
            dataset_id="zenodo_gridded_pm_v2",
            pollutant=p_upper,
            unit="µg/m³",
            year=year,
            month=month,
            period=f"{year}-{month:02d}",
            total_cells=total_cells,
            summary=summary,
            cells=cells,
        )

    def get_timeseries(
        self,
        grid_id: Optional[str] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        pollutant: str = "PM2.5",
    ) -> EnvironmentalTimeSeriesResponse:
        """Returns 72-month multi-year time series for a grid cell or coordinate."""
        p_upper = pollutant.strip().upper()
        if p_upper not in ("PM2.5", "PM10"):
            p_upper = "PM2.5"

        all_est = self._load_gridded_estimates()
        matching_cells = [e for e in all_est if e.pollutant == p_upper]

        target_grid_id = grid_id
        target_lat = lat
        target_lon = lon

        if target_grid_id is None:
            if target_lat is not None and target_lon is not None:
                best_cell = None
                best_dist = None
                for e in matching_cells:
                    d = haversine_distance_km(target_lat, target_lon, e.latitude, e.longitude)
                    if best_dist is None or d < best_dist:
                        best_dist = d
                        best_cell = e
                if best_cell:
                    target_grid_id = best_cell.grid_id
                    target_lat = best_cell.latitude
                    target_lon = best_cell.longitude
            else:
                target_grid_id = "grid_28.67_77.24"

        cell_records = [e for e in matching_cells if e.grid_id == target_grid_id]
        cell_records.sort(key=lambda x: (x.year, x.month))

        if not cell_records and matching_cells:
            target_grid_id = matching_cells[0].grid_id
            cell_records = [e for e in matching_cells if e.grid_id == target_grid_id]
            cell_records.sort(key=lambda x: (x.year, x.month))

        if cell_records:
            target_lat = cell_records[0].latitude
            target_lon = cell_records[0].longitude

        points: List[TimeSeriesPoint] = []
        vals: List[float] = []
        winter_vals: List[float] = []
        monsoon_vals: List[float] = []

        for e in cell_records:
            cat, _ = classify_aqi_category(p_upper, e.value)
            points.append(
                TimeSeriesPoint(
                    period=f"{e.year}-{e.month:02d}",
                    year=e.year,
                    month=e.month,
                    value=e.value,
                    unit=e.unit,
                    category=cat,
                )
            )
            if e.value is not None:
                vals.append(e.value)
                if e.month in (11, 12, 1):
                    winter_vals.append(e.value)
                elif e.month in (7, 8, 9):
                    monsoon_vals.append(e.value)

        mean_val = round(sum(vals) / len(vals), 2) if vals else 0.0
        min_val = round(min(vals), 2) if vals else 0.0
        max_val = round(max(vals), 2) if vals else 0.0
        winter_mean = round(sum(winter_vals) / len(winter_vals), 2) if winter_vals else mean_val
        monsoon_mean = round(sum(monsoon_vals) / len(monsoon_vals), 2) if monsoon_vals else mean_val

        return EnvironmentalTimeSeriesResponse(
            dataset_id="zenodo_gridded_pm_v2",
            pollutant=p_upper,
            unit="µg/m³",
            grid_id=target_grid_id or "unknown",
            latitude=target_lat or 28.6676,
            longitude=target_lon or 77.2431,
            total_points=len(points),
            timeseries=points,
            overall_mean=mean_val,
            overall_min=min_val,
            overall_max=max_val,
            winter_peak_mean=winter_mean,
            monsoon_dip_mean=monsoon_mean,
        )

    def get_hotspot_ranking(
        self,
        pollutant: str = "PM2.5",
        year: int = 2022,
        month: int = 12,
        limit: int = 10,
    ) -> EnvironmentalHotspotsResponse:
        """Ranks grid cells by pollutant concentration descending for active period."""
        p_upper = pollutant.strip().upper()
        if p_upper not in ("PM2.5", "PM10"):
            p_upper = "PM2.5"

        grid_resp = self.get_grid_for_period(pollutant=p_upper, year=year, month=month)
        sorted_cells = sorted([c for c in grid_resp.cells if c.value is not None], key=lambda x: (x.value or 0.0), reverse=True)

        items: List[HotspotRankItem] = []
        for idx, c in enumerate(sorted_cells[:limit], start=1):
            items.append(
                HotspotRankItem(
                    rank=idx,
                    grid_id=c.grid_id,
                    latitude=c.latitude,
                    longitude=c.longitude,
                    value=c.value or 0.0,
                    unit=c.unit,
                    category=c.category,
                    color=c.color,
                    nearest_canonical_station_id=c.nearest_station,
                    distance_to_canonical_km=c.distance_to_station_km,
                )
            )

        return EnvironmentalHotspotsResponse(
            dataset_id="zenodo_gridded_pm_v2",
            pollutant=p_upper,
            unit="µg/m³",
            year=grid_resp.year,
            month=grid_resp.month,
            period=grid_resp.period,
            total_hotspots=len(items),
            items=items,
        )

    def inspect_location(
        self,
        lat: float,
        lon: float,
        pollutant: str = "PM2.5",
        year: int = 2022,
        month: int = 12,
    ) -> LocationInspectionResponse:
        """Inspects environmental values and historical series for a clicked map coordinate."""
        p_upper = pollutant.strip().upper()
        if p_upper not in ("PM2.5", "PM10"):
            p_upper = "PM2.5"

        grid_resp = self.get_grid_for_period(pollutant=p_upper, year=year, month=month)

        best_cell: Optional[GridCellRecord] = None
        best_dist: Optional[float] = None
        for c in grid_resp.cells:
            d = haversine_distance_km(lat, lon, c.latitude, c.longitude)
            if best_dist is None or d < best_dist:
                best_dist = round(d, 2)
                best_cell = c

        if not best_cell:
            raise ValueError("No grid cells available for inspection")

        ts_resp = self.get_timeseries(grid_id=best_cell.grid_id, pollutant=p_upper)

        return LocationInspectionResponse(
            dataset_id="zenodo_gridded_pm_v2",
            pollutant=p_upper,
            unit="µg/m³",
            period=grid_resp.period,
            query_latitude=round(lat, 6),
            query_longitude=round(lon, 6),
            grid_id=best_cell.grid_id,
            cell_latitude=best_cell.latitude,
            cell_longitude=best_cell.longitude,
            cell_bounds=best_cell.bounds,
            value=best_cell.value,
            category=best_cell.category,
            color=best_cell.color,
            distance_to_query_km=best_dist or 0.0,
            nearest_station=best_cell.nearest_station,
            distance_to_station_km=best_cell.distance_to_station_km,
            timeseries=ts_resp.timeseries,
        )

    def get_corridor_comparison(
        self,
        pollutant: str = "PM2.5",
        year: int = 2022,
        month: int = 12,
    ) -> List[Dict[str, Any]]:
        """Compares regional ambient grid concentration at each canonical railway station."""
        p_upper = pollutant.strip().upper()
        if p_upper not in ("PM2.5", "PM10"):
            p_upper = "PM2.5"

        grid_resp = self.get_grid_for_period(pollutant=p_upper, year=year, month=month)

        station_comparisons = []
        for st in CANONICAL_STATIONS:
            best_cell = None
            best_dist = None
            for c in grid_resp.cells:
                d = haversine_distance_km(st["lat"], st["lng"], c.latitude, c.longitude)
                if best_dist is None or d < best_dist:
                    best_dist = round(d, 2)
                    best_cell = c

            station_comparisons.append({
                "station_id": st["id"],
                "ir_code": st.get("ir_code"),
                "station_name": st["name"],
                "city": st["city"],
                "latitude": st["lat"],
                "longitude": st["lng"],
                "grid_id": best_cell.grid_id if best_cell else None,
                "ambient_grid_value": best_cell.value if best_cell else None,
                "unit": "µg/m³",
                "category": best_cell.category if best_cell else "Unknown",
                "color": best_cell.color if best_cell else "#64748B",
                "distance_to_cell_km": best_dist,
            })

        return station_comparisons


# Singleton service instance
environmental_service = EnvironmentalService()
