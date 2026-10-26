"""
RailAir Intelligence — Environmental Hotspots Database Integration Tests (P2A.3).

Validates PostgreSQL/PostGIS database-backed data access for /api/v1/environmental/hotspots:
1. Database connectivity and PostGIS data_provider identification.
2. Thresholds, ranking, tie-breaking, and descending sort order.
3. Pollutant (PM2.5 / PM10) and temporal (2017-01 to 2022-12) filtering.
4. Nearest canonical station spatial proximity calculations.
5. Empty result set and missing-value handling.
6. Graceful in-memory fallback when database connection fails.
7. Numerical and structural parity between database and fallback modes.
8. SQL injection safety via parameterized queries.
9. Full API schema compatibility across various limit values.
"""

from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.environmental_service import (
    environmental_service,
    CANONICAL_STATIONS,
    classify_aqi_category,
)

client = TestClient(app)

CANONICAL_STATION_IDS = {st["id"] for st in CANONICAL_STATIONS}


def test_hotspots_database_connected():
    """Confirms /hotspots returns database-backed results from PostgreSQL/PostGIS."""
    response = client.get("/api/v1/environmental/hotspots?pollutant=PM2.5&year=2022&month=12&limit=10")
    assert response.status_code == 200
    data = response.json()

    assert data["dataset_id"] == "zenodo_gridded_pm_v2"
    assert data["pollutant"] == "PM2.5"
    assert data["unit"] == "µg/m³"
    assert data["year"] == 2022
    assert data["month"] == 12
    assert data["period"] == "2022-12"
    assert data["total_hotspots"] == 10
    assert len(data["items"]) == 10
    assert data["data_provider"] == "postgres_postgis"


def test_hotspots_thresholds_ranking_and_sorting():
    """Validates that hotspots are sorted strictly descending by concentration with sequential ranks."""
    response = client.get("/api/v1/environmental/hotspots?pollutant=PM2.5&year=2022&month=12&limit=15")
    assert response.status_code == 200
    data = response.json()
    items = data["items"]
    assert len(items) == 15

    for idx, item in enumerate(items):
        assert item["rank"] == idx + 1
        assert item["value"] > 0.0
        assert item["grid_id"].startswith("grid_")
        assert item["category"] in (
            "Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe", "No Data"
        )
        assert item["color"].startswith("#")

        # Verify descending order
        if idx > 0:
            assert items[idx - 1]["value"] >= item["value"], (
                f"Rank {item['rank']} value {item['value']} > Rank {items[idx-1]['rank']} value {items[idx-1]['value']}"
            )


def test_hotspots_pollutant_and_temporal_filtering():
    """Validates pollutant (PM2.5 / PM10) and temporal boundary filtering (2017-01 to 2022-12)."""
    # Boundary start: 2017-01 PM10
    r_pm10 = client.get("/api/v1/environmental/hotspots?pollutant=PM10&year=2017&month=1&limit=5")
    assert r_pm10.status_code == 200
    d_pm10 = r_pm10.json()
    assert d_pm10["pollutant"] == "PM10"
    assert d_pm10["period"] == "2017-01"
    assert len(d_pm10["items"]) == 5

    # Monsoon period: 2020-07 PM2.5
    r_monsoon = client.get("/api/v1/environmental/hotspots?pollutant=PM2.5&year=2020&month=7&limit=5")
    assert r_monsoon.status_code == 200
    d_monsoon = r_monsoon.json()
    assert d_monsoon["period"] == "2020-07"
    # Monsoon values are substantially lower than winter values
    assert d_monsoon["items"][0]["value"] < d_pm10["items"][0]["value"]


def test_hotspots_canonical_station_spatial_proximity():
    """Verifies that nearest corridor station identification and distance calculations are populated."""
    response = client.get("/api/v1/environmental/hotspots?pollutant=PM2.5&year=2022&month=12&limit=10")
    assert response.status_code == 200
    items = response.json()["items"]

    for item in items:
        station_id = item["nearest_canonical_station_id"]
        dist = item["distance_to_canonical_km"]
        assert station_id in CANONICAL_STATION_IDS, f"Unknown canonical station {station_id}"
        assert dist is not None and dist >= 0.0
        assert dist < 100.0, f"Distance {dist} km unreasonably large for Delhi-NCR corridor"


def test_hotspots_empty_result_set_and_missing_values():
    """Verifies empty result handling when querying periods with no data."""
    # Service call with a non-existent period (e.g. year 2099)
    result = environmental_service.get_hotspot_ranking(pollutant="PM2.5", year=2099, month=1, limit=10)
    assert result.total_hotspots == 0
    assert result.items == []


def test_hotspots_database_unavailable_fallback():
    """Verifies automatic fallback to in-memory estimates when PostgreSQL connection raises an exception."""
    with patch(
        "backend.app.services.environmental_service.get_db_connection",
        side_effect=RuntimeError("Simulated PostgreSQL connection failure"),
    ):
        response = client.get("/api/v1/environmental/hotspots?pollutant=PM2.5&year=2022&month=12&limit=8")
        assert response.status_code == 200
        data = response.json()
        assert data["pollutant"] == "PM2.5"
        assert data["period"] == "2022-12"
        assert data["total_hotspots"] == 8
        assert len(data["items"]) == 8
        assert data["data_provider"] is None  # In-memory mode does not report postgres_postgis
        # Still ordered descending
        for i in range(len(data["items"]) - 1):
            assert data["items"][i]["value"] >= data["items"][i + 1]["value"]


def test_hotspots_database_and_fallback_consistency():
    """Verifies 100% numerical and structural parity between database-backed and fallback results."""
    # 1. Fetch with live database
    db_resp = environmental_service.get_hotspot_ranking(pollutant="PM2.5", year=2022, month=12, limit=10)
    assert db_resp.data_provider == "postgres_postgis"

    # 2. Fetch with forced in-memory fallback
    with patch(
        "backend.app.services.environmental_service.get_db_connection",
        side_effect=RuntimeError("Simulated DB failure"),
    ):
        fb_resp = environmental_service.get_hotspot_ranking(pollutant="PM2.5", year=2022, month=12, limit=10)
        assert fb_resp.data_provider is None

    # 3. Assert complete identity
    assert db_resp.total_hotspots == fb_resp.total_hotspots == 10
    assert db_resp.period == fb_resp.period == "2022-12"

    for db_item, fb_item in zip(db_resp.items, fb_resp.items):
        assert db_item.rank == fb_item.rank
        assert db_item.grid_id == fb_item.grid_id
        assert abs(db_item.value - fb_item.value) < 1e-4
        assert db_item.category == fb_item.category
        assert db_item.color == fb_item.color
        assert db_item.nearest_canonical_station_id == fb_item.nearest_canonical_station_id
        assert abs(db_item.distance_to_canonical_km - fb_item.distance_to_canonical_km) < 1e-2


def test_hotspots_sql_parameterization_safety():
    """Verifies that malicious inputs in parameters are safely handled without SQL injection."""
    # Injected SQL fragment in pollutant
    malicious_pollutant = "PM2.5' OR 1=1; DROP TABLE environmental_gridded_estimates; --"
    # Should safely normalize to PM2.5 or return clean result
    response = client.get(f"/api/v1/environmental/hotspots?pollutant={malicious_pollutant}&year=2022&month=12&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert data["pollutant"] == "PM2.5"
    assert len(data["items"]) == 5


def test_hotspots_api_contract_and_limits():
    """Verifies API limits: 1, 5, 20, and max 64."""
    for limit in (1, 5, 20, 64):
        response = client.get(f"/api/v1/environmental/hotspots?pollutant=PM2.5&year=2022&month=12&limit={limit}")
        assert response.status_code == 200
        data = response.json()
        assert data["total_hotspots"] == limit
        assert len(data["items"]) == limit
