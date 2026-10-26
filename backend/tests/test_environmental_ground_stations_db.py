"""
RailAir Intelligence — Environmental Ground Stations Database Integration Tests (P2A.4).

Validates PostgreSQL/PostGIS database-backed access for /api/v1/environmental/ground-stations:
1. Database-backed canonical station metadata retrieval from `stations` table.
2. Canonical internal IDs vs official CRIS railway codes (DSO/DSA, SAH/SBB, MMU/MDNR, MNR/MUD, MRT/MTC).
3. Station ordering by corridor distance (MRT at 0 km to NDLS at 83 km).
4. Ground station query filtering (pollutant, canonical_station_id, city, quality_status, pagination).
5. Strict preservation of missing values as None/null (never coerced to 0.0).
6. Database-unavailable graceful fallback for both station metadata and observations.
7. Empty result handling for non-matching criteria.
8. Strict separation: modelled gridded estimates are never misrepresented as measured station telemetry.
9. Parity between database-backed station metadata and in-memory fallback.
10. SQL parameterization safety against injection attempts.
"""

from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.environmental_service import environmental_service

client = TestClient(app)

# Canonical internal station IDs and their official Indian Railways CRIS codes
EXPECTED_IR_CODES = {
    "MRT": "MTC",    # Meerut City Junction
    "MMU": "MDNR",   # Modinagar
    "MNR": "MUD",    # Muradnagar
    "GZB": "GZB",    # Ghaziabad Junction
    "SAH": "SBB",    # Sahibabad Junction
    "DSO": "DSA",    # Delhi Shahdara Junction
    "NDLS": "NDLS",  # New Delhi
}


def test_canonical_stations_database_metadata_retrieval():
    """Validates that canonical station metadata is retrieved from PostgreSQL stations table."""
    stations = environmental_service.get_canonical_stations_metadata()
    assert len(stations) == 7, f"Expected 7 canonical stations, got {len(stations)}"

    for st in stations:
        assert st["data_provider"] == "postgres_postgis"
        assert st["id"] in EXPECTED_IR_CODES
        assert st["ir_code"] == EXPECTED_IR_CODES[st["id"]]
        assert st["latitude"] > 0.0
        assert st["longitude"] > 0.0
        assert st["station_type"] in ("major", "halt", "junction", "terminal")


def test_canonical_internal_ids_vs_cris_railway_codes():
    """Verifies that internal IDs map to official CRIS IR codes and are exposed on ground station items."""
    response = client.get("/api/v1/environmental/ground-stations?corridor_only=true&limit=50")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) > 0

    mapped_items = [it for it in data["items"] if it["nearest_canonical_station_id"] is not None]
    assert len(mapped_items) > 0

    for item in mapped_items:
        internal_id = item["nearest_canonical_station_id"]
        cris_code = item.get("canonical_ir_code")
        assert internal_id in EXPECTED_IR_CODES
        assert cris_code == EXPECTED_IR_CODES[internal_id], (
            f"Expected CRIS code {EXPECTED_IR_CODES[internal_id]} for {internal_id}, got {cris_code}"
        )


def test_canonical_stations_corridor_ordering():
    """Validates that canonical corridor stations are ordered strictly by distance from origin."""
    stations = environmental_service.get_canonical_stations_metadata()
    assert len(stations) == 7

    # Distances must increase monotonically from Meerut (0 km) to New Delhi (83 km)
    distances = [st["distance_from_origin_km"] for st in stations]
    for i in range(len(distances) - 1):
        assert distances[i] <= distances[i + 1]

    assert stations[0]["id"] == "MRT"
    assert stations[0]["distance_from_origin_km"] == 0.0
    assert stations[-1]["id"] == "NDLS"
    assert stations[-1]["distance_from_origin_km"] == 83.0


def test_ground_stations_endpoint_metadata_and_filtering():
    """Validates /ground-stations with various filters and checks station_metadata_provider."""
    # 1. Base query
    res = client.get("/api/v1/environmental/ground-stations?limit=20")
    assert res.status_code == 200
    data = res.json()
    assert data["station_metadata_provider"] == "postgres_postgis"
    assert len(data["items"]) == 20

    # 2. Pollutant filter: PM10
    res_pm10 = client.get("/api/v1/environmental/ground-stations?pollutant=PM10&limit=20")
    assert res_pm10.status_code == 200
    for it in res_pm10.json()["items"]:
        assert it["pollutant"] == "PM10"

    # 3. Canonical station filter: MRT
    res_mrt = client.get("/api/v1/environmental/ground-stations?canonical_station_id=MRT&limit=20")
    assert res_mrt.status_code == 200
    for it in res_mrt.json()["items"]:
        assert it["nearest_canonical_station_id"] == "MRT"
        assert it["canonical_ir_code"] == "MTC"
        assert it["distance_to_canonical_km"] <= 25.0

    # 4. Quality status filter: missing_na
    res_missing = client.get("/api/v1/environmental/ground-stations?quality_status=missing_na&limit=20")
    assert res_missing.status_code == 200
    for it in res_missing.json()["items"]:
        assert it["quality_status"] == "missing_na"
        assert it["value_avg"] is None


def test_ground_stations_null_preservation():
    """Verifies missing sensor telemetry is strictly preserved as None/null, never 0.0."""
    response = client.get("/api/v1/environmental/ground-stations?quality_status=missing_na&limit=50")
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) > 0

    for item in items:
        assert item["value_avg"] is None, "Missing reading must be JSON null, never coerced to 0.0"
        assert item["value_min"] is None
        assert item["value_max"] is None


def test_database_unavailable_fallback():
    """Verifies graceful fallback to in-memory metadata and observations when DB connection fails."""
    with patch(
        "backend.app.services.environmental_service.get_db_connection",
        side_effect=RuntimeError("Simulated database failure"),
    ):
        # 1. Canonical stations metadata fallback
        stations = environmental_service.get_canonical_stations_metadata()
        assert len(stations) == 7
        for st in stations:
            assert st["data_provider"] == "in_memory_synthetic"
            assert st["ir_code"] == EXPECTED_IR_CODES[st["id"]]

        # 2. HTTP ground-stations endpoint fallback
        response = client.get("/api/v1/environmental/ground-stations?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert data["station_metadata_provider"] == "in_memory_synthetic"
        assert len(data["items"]) == 10
        # IR codes are still resolved from fallback map
        mapped = [it for it in data["items"] if it["nearest_canonical_station_id"] is not None]
        for it in mapped:
            assert it["canonical_ir_code"] == EXPECTED_IR_CODES[it["nearest_canonical_station_id"]]


def test_empty_or_nonexistent_filter_handling():
    """Verifies that non-matching query parameters return empty results gracefully."""
    response = client.get("/api/v1/environmental/ground-stations?city=NonExistentCityXYZ")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["returned"] == 0
    assert data["items"] == []


def test_modelled_estimates_never_misrepresented_as_ground_telemetry():
    """Explicitly verifies that modelled gridded estimates are never served as ground station observations."""
    response = client.get("/api/v1/environmental/ground-stations?limit=50")
    assert response.status_code == 200
    data = response.json()

    for item in data["items"]:
        # Ground stations must be CPCB statutory telemetry, NOT modelled gridded rasters
        assert item["dataset_id"] == "cpcb_snapshot_2026"
        assert item["dataset_id"] != "zenodo_gridded_pm_v2"
        assert "grid_id" not in item
        assert "observation_type" not in item or item["observation_type"] != "gridded_surface_estimate"


def test_station_metadata_parity_database_vs_fallback():
    """Validates complete parity between database-backed station metadata and in-memory fallback."""
    # 1. Database-backed
    db_stations = environmental_service.get_canonical_stations_metadata()

    # 2. Forced fallback
    with patch(
        "backend.app.services.environmental_service.get_db_connection",
        side_effect=RuntimeError("Simulated DB offline"),
    ):
        fb_stations = environmental_service.get_canonical_stations_metadata()

    assert len(db_stations) == len(fb_stations) == 7

    db_map = {st["id"]: st for st in db_stations}
    fb_map = {st["id"]: st for st in fb_stations}

    for st_id in EXPECTED_IR_CODES:
        assert st_id in db_map and st_id in fb_map
        assert db_map[st_id]["ir_code"] == fb_map[st_id]["ir_code"] == EXPECTED_IR_CODES[st_id]
        # Coordinates match within tolerance
        assert abs(db_map[st_id]["latitude"] - fb_map[st_id]["latitude"]) < 0.02
        assert abs(db_map[st_id]["longitude"] - fb_map[st_id]["longitude"]) < 0.02


def test_ground_stations_sql_parameterization_safety():
    """Verifies that malicious SQL input strings in query parameters are safely handled."""
    malicious_inputs = [
        "PM2.5' OR 1=1; DROP TABLE stations; --",
        "MRT'; SELECT * FROM stations; --",
        "Delhi' UNION SELECT null, null, null; --",
    ]
    for param in malicious_inputs:
        res = client.get(f"/api/v1/environmental/ground-stations?pollutant={param}&limit=5")
        assert res.status_code == 200
        # Should return 0 matching items safely without SQL error
        assert res.json()["total"] == 0
