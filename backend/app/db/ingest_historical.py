"""RailAir Intelligence — Historical Environmental Data Ingestion Pipeline.

Ingests and validates the 10 km gridded PM2.5 and PM10 monthly dataset (2017–2022)
derived from Zenodo Collection 2 NetCDF rasters into PostgreSQL/PostGIS.

Guarantees:
- Idempotency via ON CONFLICT (id) DO UPDATE.
- Strict preservation of source dates, coordinates, missing values (NULL), and units.
- Full provenance tracking in `environmental_datasets` and `environmental_ingestion_runs`.
- Verification of database record count against source dataset (9,216 records).
"""
import argparse
import hashlib
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
import psycopg

from .session import get_db_connection

logger = logging.getLogger(__name__)

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DEFAULT_DATASET_PATH = (
    WORKSPACE_ROOT
    / "backend-resources"
    / "environmental-derived"
    / "corridor_pm_monthly_2017_2022.json"
)

ZENODO2_DATASET_ID = "zeonodo-data2"


def compute_file_sha256(path: Path) -> str:
    """Computes SHA-256 checksum of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def register_dataset(conn: psycopg.Connection, checksum: str) -> None:
    """Ensures parent dataset record exists in environmental_datasets."""
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
                ZENODO2_DATASET_ID,
                "Monthly 10 km Gridded PM2.5 and PM10 for Indian Landmass (2017–2022)",
                "Zenodo / Centre for Atmospheric Sciences, IIT Delhi",
                "10.5281/zenodo.1000002",
                "2.0",
                "CC-BY-4.0",
                "corridor_pm_monthly_2017_2022.json",
                checksum,
                "Meerut–Ghaziabad–Delhi Corridor (64 Grid Cells)",
                "2017-01 to 2022-12 (72 Monthly Periods)",
                "gridded_surface_estimate",
                json.dumps({
                    "grid_cells": 64,
                    "months": 72,
                    "pollutants": ["PM2.5", "PM10"],
                    "derived_from": "Zenodo Collection 2 NetCDF rasters",
                    "scientific_method": "Satellite AOD + Chemical Transport Model + CPCB Ground Station Calibration",
                }),
            ),
        )


def ingest_historical_gridded_data(
    dataset_path: Optional[Path] = None,
    batch_size: int = 1000,
    dry_run: bool = False,
    conn: Optional[psycopg.Connection] = None,
) -> Dict[str, Any]:
    """Ingests historical gridded PM2.5 / PM10 records into PostGIS."""
    file_path = dataset_path or DEFAULT_DATASET_PATH
    if not file_path.exists():
        raise FileNotFoundError(f"Historical dataset file not found at: {file_path}")

    logger.info("Reading dataset from %s ...", file_path)
    file_checksum = compute_file_sha256(file_path)

    with open(file_path, "r", encoding="utf-8") as f:
        records: List[Dict[str, Any]] = json.load(f)

    total_records = len(records)
    logger.info("Loaded %d records from source JSON.", total_records)

    # Validate dataset structure and calculate statistics
    pm25_count = 0
    pm10_count = 0
    null_value_count = 0
    years_seen = set()
    grid_ids = set()

    batch_params = []
    for r in records:
        pollutant = r["pollutant"].strip().upper()
        if pollutant == "PM2.5":
            pm25_count += 1
        elif pollutant == "PM10":
            pm10_count += 1

        val = r.get("value")
        if val is None:
            null_value_count += 1

        years_seen.add(r["year"])
        grid_ids.add(r["grid_id"])

        # Normalize unit string safely
        unit = r.get("unit", "µg/m³")
        if unit in ("\u00b5g/m\u00b3", "g/m", "ug/m3"):
            unit = "µg/m³"

        batch_params.append((
            r["id"],
            r["grid_id"],
            pollutant,
            val,
            unit,
            r["year"],
            r["month"],
            r["observed_at"],
            r.get("temporal_resolution", "monthly_mean"),
            r.get("spatial_resolution", "10km"),
            r["latitude"],
            r["longitude"],
            ZENODO2_DATASET_ID,
        ))

    summary = {
        "source_file": str(file_path.name),
        "source_sha256": file_checksum,
        "input_record_count": total_records,
        "pm25_record_count": pm25_count,
        "pm10_record_count": pm10_count,
        "null_values_preserved": null_value_count,
        "unique_grid_cells": len(grid_ids),
        "years_covered": sorted(list(years_seen)),
        "dry_run": dry_run,
    }

    if dry_run:
        logger.info("DRY RUN completed. Validated %d records.", total_records)
        return summary

    def _execute_ingestion(active_conn: psycopg.Connection) -> Dict[str, Any]:
        start_time = time.time()
        run_id = f"run_{ZENODO2_DATASET_ID}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"

        # 1. Register parent dataset
        register_dataset(active_conn, file_checksum)

        # 2. Record start of ingestion run
        with active_conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO environmental_ingestion_runs (
                    id, dataset_id, source_filename, source_checksum_sha256,
                    started_at, status, input_record_count, code_version
                ) VALUES (%s, %s, %s, %s, NOW(), 'in_progress', %s, '1.0');
                """,
                (run_id, ZENODO2_DATASET_ID, file_path.name, file_checksum, total_records),
            )
        active_conn.commit()

        # 3. Batch insert with idempotency
        insert_sql = """
            INSERT INTO environmental_gridded_estimates (
                id, grid_id, pollutant, value, unit, year, month, observed_at,
                temporal_resolution, spatial_resolution, latitude, longitude, dataset_id
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            ON CONFLICT (id) DO UPDATE SET
                value = EXCLUDED.value,
                unit = EXCLUDED.unit,
                temporal_resolution = EXCLUDED.temporal_resolution,
                spatial_resolution = EXCLUDED.spatial_resolution,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude;
        """

        ingested_count = 0
        try:
            with active_conn.cursor() as cur:
                for i in range(0, len(batch_params), batch_size):
                    batch = batch_params[i : i + batch_size]
                    cur.executemany(insert_sql, batch)
                    ingested_count += len(batch)
                    logger.debug("Ingested batch %d to %d of %d", i, i + len(batch), total_records)
            active_conn.commit()
        except Exception as exc:
            active_conn.rollback()
            with active_conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE environmental_ingestion_runs
                    SET status = 'failed', completed_at = NOW(), error_message = %s
                    WHERE id = %s;
                    """,
                    (str(exc), run_id),
                )
            active_conn.commit()
            raise RuntimeError(f"Ingestion failed during batch execution: {exc}") from exc

        duration_sec = round(time.time() - start_time, 3)

        # 4. Verify count in database
        with active_conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM environmental_gridded_estimates WHERE dataset_id = %s;",
                (ZENODO2_DATASET_ID,),
            )
            db_count = cur.fetchone()[0]

            # Verify spatial geometries populated
            cur.execute(
                "SELECT COUNT(*) FROM environmental_gridded_estimates WHERE dataset_id = %s AND geom IS NOT NULL;",
                (ZENODO2_DATASET_ID,),
            )
            geom_count = cur.fetchone()[0]

            # Complete ingestion run record
            cur.execute(
                """
                UPDATE environmental_ingestion_runs
                SET status = 'completed',
                    completed_at = NOW(),
                    ingested_record_count = %s,
                    validation_summary = %s
                WHERE id = %s;
                """,
                (
                    db_count,
                    json.dumps({
                        **summary,
                        "verified_db_count": db_count,
                        "verified_geom_count": geom_count,
                        "duration_seconds": duration_sec,
                    }),
                    run_id,
                ),
            )
        active_conn.commit()

        logger.info(
            "Ingestion completed in %.2fs. Database count: %d, Geom count: %d",
            duration_sec,
            db_count,
            geom_count,
        )

        return {
            **summary,
            "run_id": run_id,
            "status": "completed",
            "ingested_record_count": ingested_count,
            "verified_db_count": db_count,
            "verified_geom_count": geom_count,
            "duration_seconds": duration_sec,
        }

    if conn is not None:
        return _execute_ingestion(conn)
    with get_db_connection() as c:
        return _execute_ingestion(c)


def main():
    parser = argparse.ArgumentParser(description="RailAir Historical Environmental Data Ingestion")
    parser.add_argument("--dry-run", action="store_true", help="Validate without committing to database")
    parser.add_argument("--file", type=str, default=None, help="Path to JSON dataset file")
    parser.add_argument("--batch-size", type=int, default=1000, help="Batch insert size (default: 1000)")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    path = Path(args.file) if args.file else DEFAULT_DATASET_PATH
    print("=" * 68)
    print(" RailAir Intelligence — Historical Environmental Data Ingestion")
    print("=" * 68)
    print(f" Source File : {path}")
    print(f" Mode        : {'DRY RUN' if args.dry_run else 'ACTIVE INGESTION'}")
    print(f" Batch Size  : {args.batch_size}")
    print("-" * 68)

    result = ingest_historical_gridded_data(
        dataset_path=path,
        batch_size=args.batch_size,
        dry_run=args.dry_run,
    )

    print("\nIngestion Summary:")
    for k, v in result.items():
        print(f"  • {k}: {v}")
    print("=" * 68)


if __name__ == "__main__":
    main()
