"""
RailAir Intelligence — PostgreSQL + PostGIS Foundation & Ingestion Integration Tests.

Validates Phase B, Phase C, and Phase D deliverables:
1. Database connectivity lifecycle and PostGIS detection.
2. Migration runner idempotency and schema tracking.
3. Station ID and railway ir_code persistence in PostgreSQL.
4. Historical 10 km gridded PM2.5/PM10 ingestion accuracy (9,216 records, 0 loss).
5. Database-backed API endpoint (/environmental/gridded/corridor) vs fallback behavior.
"""
from pathlib import Path
from typing import Dict, Any
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from backend.app.db.session import check_db_connectivity, get_db_connection
from backend.app.db.migrator import get_migration_status, apply_migrations
from backend.app.db.ingest_historical import (
    ingest_historical_gridded_data,
    ZENODO2_DATASET_ID,
    DEFAULT_DATASET_PATH,
)
from backend.app.services.environmental_service import environmental_service


def test_postgis_connectivity_and_extension_detection():
    """Verifies that PostGIS is detected and active."""
    status = check_db_connectivity()
    assert status["connected"] is True
    assert status["mode"] == "postgres"
    assert "PostgreSQL" in status["detail"]
    assert "PostGIS" in status["detail"]


def test_migrator_status_and_idempotency():
    """Verifies that migrations are tracked in schema_migrations and idempotent."""
    status = get_migration_status()
    assert status["total_migrations"] >= 2
    assert status["applied_count"] >= 2
    assert status["pending_count"] == 0

    # Applying already-applied migrations should return empty list without error
    applied = apply_migrations()
    assert len(applied) == 0


def test_stations_table_and_ir_code_persistence():
    """Verifies station IDs, ir_codes, and PostGIS geometries in PostgreSQL."""
    expected_station_ir_map = {
        "MRT": "MTC",
        "MMU": "MDNR",
        "MNR": "MUD",
        "GZB": "GZB",
        "SAH": "SBB",
        "DSO": "DSA",
        "NDLS": "NDLS",
    }

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, ir_code, name, ST_AsText(geom) FROM stations ORDER BY id;")
            rows = cur.fetchall()
            assert len(rows) == 7
            db_map = {r[0]: r[1] for r in rows}
            assert db_map == expected_station_ir_map

            # Check point geometry
            for r in rows:
                geom_text = r[3]
                assert geom_text.startswith("POINT(")


def test_historical_ingestion_accuracy_and_provenance():
    """Verifies that the historical 9,216 records are present and provenance is registered."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # 1. Dataset registry
            cur.execute("SELECT id, title, measurement_type FROM environmental_datasets WHERE id = %s;", (ZENODO2_DATASET_ID,))
            ds_row = cur.fetchone()
            assert ds_row is not None
            assert ds_row[0] == ZENODO2_DATASET_ID
            assert ds_row[2] == "gridded_surface_estimate"

            # 2. Ingested record count
            cur.execute("SELECT COUNT(*) FROM environmental_gridded_estimates WHERE dataset_id = %s;", (ZENODO2_DATASET_ID,))
            total_count = cur.fetchone()[0]
            assert total_count == 9216

            # 3. PM2.5 and PM10 breakdown
            cur.execute(
                "SELECT pollutant, COUNT(*) FROM environmental_gridded_estimates WHERE dataset_id = %s GROUP BY pollutant ORDER BY pollutant;",
                (ZENODO2_DATASET_ID,),
            )
            breakdown = dict(cur.fetchall())
            assert breakdown.get("PM2.5") == 4608
            assert breakdown.get("PM10") == 4608

            # 4. Ingestion runs table
            cur.execute("SELECT status, ingested_record_count FROM environmental_ingestion_runs WHERE dataset_id = %s ORDER BY started_at DESC LIMIT 1;", (ZENODO2_DATASET_ID,))
            run_row = cur.fetchone()
            assert run_row is not None
            assert run_row[0] == "completed"
            assert run_row[1] == 9216


def test_database_backed_gridded_api_endpoint(client: TestClient):
    """Verifies that the gridded API queries PostGIS and returns data_provider: postgres_postgis."""
    response = client.get("/api/v1/environmental/gridded/corridor?pollutant=PM2.5&year=2022&month=12&limit=50")
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 64
    assert data["returned"] == 50
    assert data.get("data_provider") == "postgres_postgis"
    assert len(data["items"]) == 50

    first_item = data["items"][0]
    assert first_item["pollutant"] == "PM2.5"
    assert first_item["year"] == 2022
    assert first_item["month"] == 12
    assert first_item["unit"] == "µg/m³"
    assert "latitude" in first_item
    assert "longitude" in first_item


def test_gridded_api_graceful_fallback(client: TestClient):
    """Verifies that if database connection drops, endpoint falls back gracefully to in-memory."""
    with patch("backend.app.services.environmental_service.check_db_connectivity", return_value={"connected": False}):
        response = client.get("/api/v1/environmental/gridded/corridor?pollutant=PM2.5&year=2022&month=12&limit=50")
        assert response.status_code == 200
        data = response.json()

        assert data["total"] == 64
        assert data["returned"] == 50
        assert data.get("data_provider") is None
        assert len(data["items"]) == 50
