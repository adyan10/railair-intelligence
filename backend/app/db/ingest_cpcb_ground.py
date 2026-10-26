"""
RailAir Intelligence — CPCB CAAQMS Ground Telemetry Ingestion Pipeline (P2B).

Reads and normalizes the statutory Central Pollution Control Board (CPCB) / Data.gov.in
continuous ambient air quality monitoring station (CAAQMS) snapshot into PostgreSQL/PostGIS.

Guarantees:
1. Deterministic file location independent of shell working directory.
2. Strict column validation and fail-safe handling of malformed records.
3. Timestamp normalization to UTC (IST UTC+05:30 -> UTC).
4. Strict NULL preservation for sensor calibration / missing values (never coerced to 0.0).
5. Clean spatial mapping to canonical railway corridor stations within 25 km.
6. Complete idempotency via ON CONFLICT (source_station_name, pollutant, observed_at) DO UPDATE.
7. Provenance registration in environmental_datasets and audit run tracking in environmental_ingestion_runs.
8. Strict segregation: measured CPCB telemetry is never conflated with gridded model estimates.
"""

import argparse
import csv
import hashlib
import json
import logging
import re
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import psycopg

from .session import get_db_connection
from ..services.environmental_service import CANONICAL_STATIONS, haversine_distance_km

logger = logging.getLogger(__name__)

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DEFAULT_CPCB_CSV_PATH = (
    WORKSPACE_ROOT
    / "backend-resources"
    / "data-gov-in"
    / "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69.csv"
)

CPCB_DATASET_ID = "cpcb_snapshot_2026"
IST_TIMEZONE = timezone(timedelta(hours=5, minutes=30))

REQUIRED_CSV_COLUMNS = [
    "country",
    "state",
    "city",
    "station",
    "last_update",
    "latitude",
    "longitude",
    "pollutant_id",
    "pollutant_min",
    "pollutant_max",
    "pollutant_avg",
]


def compute_file_sha256(path: Path) -> str:
    """Computes SHA-256 checksum of the source CSV file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def register_cpcb_dataset(conn: psycopg.Connection, checksum: str) -> None:
    """Registers CPCB statutory dataset metadata in environmental_datasets."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO environmental_datasets (
                id, title, publisher, persistent_id, version, license,
                source_filename, source_checksum_sha256, spatial_coverage,
                temporal_coverage, measurement_type, metadata_json
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                publisher = EXCLUDED.publisher,
                source_checksum_sha256 = EXCLUDED.source_checksum_sha256,
                metadata_json = EXCLUDED.metadata_json;
            """,
            (
                CPCB_DATASET_ID,
                "CPCB Real-Time CAAQMS Ambient Air Quality Snapshot (National Monitoring Network)",
                "Central Pollution Control Board (CPCB) / Data.gov.in",
                "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69",
                "2026-10-25-hourly",
                "Government Open Data License - India (GODL-India)",
                "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69.csv",
                checksum,
                "National - India (278 Monitoring Cities, Meerut-Delhi Corridor Overlap)",
                "2026-10-25T03:00:00+05:30",
                "in_situ_ground",
                json.dumps({
                    "data_provider": "CPCB Open Government Data (OGD) Platform India",
                    "publisher_url": "https://data.gov.in/resource/real-time-ambient-air-quality-monitoring-stations",
                    "parameters_monitored": ["PM2.5", "PM10", "NO2", "SO2", "CO", "OZONE", "NH3"],
                    "provenance": "official_regulatory_ground_telemetry",
                    "ingestion_engine": "RailAir Intelligence P2B Ingestion Pipeline",
                }),
            ),
        )


def parse_numeric_measurement(raw_val: Optional[str]) -> Optional[float]:
    """Parses numeric concentration value, strictly preserving NULLs for NA/calibration."""
    if raw_val is None:
        return None
    cleaned = raw_val.strip().upper()
    if not cleaned or cleaned in ("NA", "NULL", "NAN", "-", "N/A", "NONE"):
        return None
    try:
        val = float(cleaned)
        return round(val, 4)
    except ValueError:
        return None


def parse_cpcb_timestamp(raw_time: Optional[str]) -> datetime:
    """Normalizes CPCB IST timestamp string ('DD-MM-YYYY HH:MM:SS') to UTC datetime."""
    if not raw_time or not raw_time.strip():
        # Default fallback to snapshot epoch if missing
        return datetime(2026, 10, 24, 21, 30, 0, tzinfo=timezone.utc)

    cleaned = raw_time.strip()
    match = re.match(r"(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})", cleaned)
    if match:
        day, month, year, hour, minute, second = [int(x) for x in match.groups()]
        dt_ist = datetime(year, month, day, hour, minute, second, tzinfo=IST_TIMEZONE)
        return dt_ist.astimezone(timezone.utc)

    # ISO format fallback
    try:
        dt = datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
        return dt.astimezone(timezone.utc)
    except Exception:
        return datetime(2026, 10, 24, 21, 30, 0, tzinfo=timezone.utc)


def resolve_canonical_railway_station(lat: float, lon: float, max_radius_km: float = 25.0) -> Tuple[Optional[str], Optional[float]]:
    """Resolves nearest canonical corridor station if within max_radius_km."""
    nearest_station: Optional[str] = None
    min_dist: Optional[float] = None

    for st in CANONICAL_STATIONS:
        dist = haversine_distance_km(lat, lon, st["lat"], st["lng"])
        if min_dist is None or dist < min_dist:
            min_dist = round(dist, 2)
            nearest_station = st["id"]

    if min_dist is not None and min_dist <= max_radius_km:
        return nearest_station, min_dist
    return None, None


def generate_deterministic_observation_id(station: str, pollutant: str, observed_at: datetime) -> str:
    """Generates a stable, deterministic primary key for an observation."""
    clean_st = re.sub(r"[^a-zA-Z0-9]+", "_", station).strip("_").lower()[:35]
    clean_p = pollutant.lower().replace(".", "")
    time_key = observed_at.strftime("%Y%m%d%H%M")
    hash_suffix = hashlib.md5(f"{station}|{pollutant}|{observed_at.isoformat()}".encode("utf-8")).hexdigest()[:8]
    return f"cpcb_{clean_st}_{clean_p}_{time_key}_{hash_suffix}"


def ingest_cpcb_ground_data(
    csv_path: Optional[Path] = None,
    batch_size: int = 500,
    dry_run: bool = False,
    conn: Optional[psycopg.Connection] = None,
) -> Dict[str, Any]:
    """Ingests statutory CPCB ground CAAQMS observations into PostgreSQL/PostGIS.
    
    Guarantees idempotency, transaction safety, and strict NULL preservation.
    """
    file_path = csv_path or DEFAULT_CPCB_CSV_PATH
    if not file_path.exists():
        raise FileNotFoundError(f"CPCB source CSV file not found at: {file_path}")

    logger.info("Reading CPCB ground telemetry from %s ...", file_path)
    file_checksum = compute_file_sha256(file_path)

    # 1. Read and validate CSV structure
    with open(file_path, "r", encoding="utf-8-sig", errors="replace") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise ValueError(f"Empty or malformed CSV file at {file_path}")

        missing_cols = [c for c in REQUIRED_CSV_COLUMNS if c not in reader.fieldnames]
        if missing_cols:
            raise ValueError(f"CSV missing required columns: {missing_cols}")

        raw_rows = list(reader)

    total_input = len(raw_rows)
    logger.info("Loaded %d raw CSV rows. Validating records...", total_input)

    # 2. Parse, validate, and transform records
    valid_records: List[Tuple] = []
    rejected_records: List[Dict[str, Any]] = []
    null_value_count = 0
    valid_value_count = 0
    pollutants_seen = set()
    cities_seen = set()
    stations_seen = set()
    corridor_overlap_count = 0

    acquisition_dt = datetime(2026, 10, 24, 21, 30, 0, tzinfo=timezone.utc)

    for idx, row in enumerate(raw_rows):
        # Coordinates validation
        try:
            lat = float(row.get("latitude") or 0.0)
            lon = float(row.get("longitude") or 0.0)
        except (ValueError, TypeError):
            rejected_records.append({"row_index": idx, "reason": "invalid_coordinates_non_numeric", "data": row})
            continue

        if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0) or (lat == 0.0 and lon == 0.0):
            rejected_records.append({"row_index": idx, "reason": "coordinates_out_of_range", "data": row})
            continue

        station_name = (row.get("station") or "").strip()
        if not station_name:
            rejected_records.append({"row_index": idx, "reason": "empty_station_name", "data": row})
            continue

        city = (row.get("city") or "").strip()
        state = (row.get("state") or "").strip()
        country = (row.get("country") or "India").strip()
        pollutant = (row.get("pollutant_id") or "").strip().upper()

        if not pollutant:
            rejected_records.append({"row_index": idx, "reason": "empty_pollutant", "data": row})
            continue

        pollutants_seen.add(pollutant)
        cities_seen.add(city)
        stations_seen.add(station_name)

        # Values: strictly preserve NULL for missing / calibration
        val_avg = parse_numeric_measurement(row.get("pollutant_avg"))
        val_min = parse_numeric_measurement(row.get("pollutant_min"))
        val_max = parse_numeric_measurement(row.get("pollutant_max"))

        if val_avg is None:
            null_value_count += 1
            quality_status = "missing_na"
        else:
            valid_value_count += 1
            quality_status = "valid"

        # Unit determination
        unit = "mg/m³" if pollutant == "CO" else "µg/m³"

        # Timestamps
        observed_dt = parse_cpcb_timestamp(row.get("last_update"))

        # Canonical railway station proximity (<= 25 km)
        canonical_station_id, _ = resolve_canonical_railway_station(lat, lon, max_radius_km=25.0)
        if canonical_station_id:
            corridor_overlap_count += 1

        rec_id = generate_deterministic_observation_id(station_name, pollutant, observed_dt)

        valid_records.append((
            rec_id,
            station_name,
            row.get("station_code") or None,
            city,
            state,
            country,
            canonical_station_id,
            pollutant,
            val_avg,
            val_min,
            val_max,
            unit,
            observed_dt,
            acquisition_dt,
            "hourly_snapshot",
            lat,
            lon,
            CPCB_DATASET_ID,
            quality_status,
        ))

    summary = {
        "source_file": file_path.name,
        "source_sha256": file_checksum,
        "total_rows_read": total_input,
        "accepted_records": len(valid_records),
        "rejected_records_count": len(rejected_records),
        "rejection_reasons": {
            r["reason"]: sum(1 for x in rejected_records if x["reason"] == r["reason"])
            for r in rejected_records
        },
        "valid_measurements": valid_value_count,
        "null_measurements_preserved": null_value_count,
        "unique_pollutants": sorted(list(pollutants_seen)),
        "unique_cities": len(cities_seen),
        "unique_stations": len(stations_seen),
        "canonical_corridor_mapped_records": corridor_overlap_count,
        "dry_run": dry_run,
    }

    if dry_run:
        logger.info("Dry run completed. Accepted %d / %d records.", len(valid_records), total_input)
        return summary

    def _execute_ingestion(active_conn: psycopg.Connection) -> Dict[str, Any]:
        start_time = time.time()
        run_id = f"run_{CPCB_DATASET_ID}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"

        # 1. Register dataset in environmental_datasets
        register_cpcb_dataset(active_conn, file_checksum)

        # 2. Record start of ingestion run
        with active_conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO environmental_ingestion_runs (
                    id, dataset_id, source_filename, source_checksum_sha256,
                    started_at, status, input_record_count, code_version
                ) VALUES (%s, %s, %s, %s, NOW(), 'in_progress', %s, '1.0');
                """,
                (run_id, CPCB_DATASET_ID, file_path.name, file_checksum, total_input),
            )
        active_conn.commit()

        # 3. Batch insert with strict idempotency
        insert_sql = """
            INSERT INTO environmental_ground_observations (
                id, source_station_name, source_station_code, city, state, country,
                canonical_station_id, pollutant, value_avg, value_min, value_max,
                unit, observed_at, acquisition_at, temporal_resolution,
                latitude, longitude, dataset_id, quality_status
            ) VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s
            )
            ON CONFLICT (source_station_name, pollutant, observed_at) DO UPDATE SET
                value_avg = EXCLUDED.value_avg,
                value_min = EXCLUDED.value_min,
                value_max = EXCLUDED.value_max,
                unit = EXCLUDED.unit,
                quality_status = EXCLUDED.quality_status,
                canonical_station_id = EXCLUDED.canonical_station_id,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude;
        """

        total_upserted = 0
        try:
            with active_conn.cursor() as cur:
                for i in range(0, len(valid_records), batch_size):
                    batch = valid_records[i : i + batch_size]
                    cur.executemany(insert_sql, batch)
                    total_upserted += len(batch)
            active_conn.commit()
        except Exception as exc:
            active_conn.rollback()
            # Mark run as failed
            with active_conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE environmental_ingestion_runs
                    SET completed_at = NOW(), status = 'failed', error_message = %s
                    WHERE id = %s;
                    """,
                    (str(exc), run_id),
                )
            active_conn.commit()
            raise RuntimeError(f"Ingestion transaction failed and rolled back: {exc}") from exc

        elapsed = round(time.time() - start_time, 2)

        # 4. Mark run as completed with validation summary
        run_summary = {
            **summary,
            "ingested_records": total_upserted,
            "elapsed_seconds": elapsed,
        }

        with active_conn.cursor() as cur:
            cur.execute(
                """
                UPDATE environmental_ingestion_runs
                SET completed_at = NOW(),
                    status = 'completed',
                    ingested_record_count = %s,
                    rejected_record_count = %s,
                    duplicate_record_count = 0,
                    validation_summary = %s
                WHERE id = %s;
                """,
                (total_upserted, len(rejected_records), json.dumps(run_summary), run_id),
            )
        active_conn.commit()

        logger.info(
            "Successfully ingested %d CPCB ground observations in %.2fs. (Run ID: %s)",
            total_upserted,
            elapsed,
            run_id,
        )
        return run_summary

    if conn is not None:
        return _execute_ingestion(conn)
    else:
        with get_db_connection() as managed_conn:
            return _execute_ingestion(managed_conn)


def main():
    """CLI runner for CPCB ground observations ingestion."""
    parser = argparse.ArgumentParser(description="Ingest CPCB CAAQMS ground telemetry into PostGIS.")
    parser.add_argument("--csv-path", type=Path, default=DEFAULT_CPCB_CSV_PATH, help="Path to CPCB CSV file")
    parser.add_argument("--batch-size", type=int, default=500, help="Batch insertion chunk size")
    parser.add_argument("--dry-run", action="store_true", help="Validate records without writing to database")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    result = ingest_cpcb_ground_data(
        csv_path=args.csv_path,
        batch_size=args.batch_size,
        dry_run=args.dry_run,
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
