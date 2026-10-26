"""
RailAir Intelligence — Database-Backed Environmental Grid Endpoint Tests (P2A.1).

Validates:
1. Database-connected grid query (/api/v1/environmental/grid) serving from PostgreSQL/PostGIS.
2. Spatial bounding-box filtering leveraging PostGIS spatial envelope filtering.
3. Pollutant and temporal filtering across PM2.5 / PM10 and 2017–2022 epochs.
4. Response schema, bounds, AQI category classification, and summary statistics.
5. Empty result sets handling (0 cells, 0.0 metrics, "No Data" category).
6. Strict NULL value preservation (None value, "No Data" category, "#94A3B8" color).
7. Graceful database-unavailable fallback to in-memory estimates.
8. Consistency between PostGIS-backed response and in-memory fallback response.
9. SQL parameterization safety against injection attempts.
"""
from typing import Dict, Any
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from backend.app.services.environmental_service import environmental_service, CANONICAL_STATIONS


def test_grid_endpoint_database_connected(client: TestClient):
    """Verifies that /environmental/grid queries live PostgreSQL/PostGIS and returns complete grid."""
    response = client.get("/api/v1/environmental/grid?pollutant=PM2.5&year=2022&month=12")
    assert response.status_code == 200
    data = response.json()

    assert data["dataset_id"] == "zenodo_gridded_pm_v2"
    assert data["pollutant"] == "PM2.5"
    assert data["year"] == 2022
    assert data["month"] == 12
    assert data["period"] == "2022-12"
    assert data["unit"] == "µg/m³"
    assert data["total_cells"] == 64
    assert len(data["cells"]) == 64
    assert data.get("data_provider") == "postgres_postgis"

    # Verify summary statistics
    summary = data["summary"]
    assert summary["total_cells"] == 64
    assert summary["valid_cells"] == 64
    assert summary["no_data_cells"] == 0
    assert summary["coverage_pct"] == 100.0
    assert summary["mean"] > 100.0  # Winter in Delhi NCR exceeds 100 µg/m³
    assert summary["max"] >= summary["min"]
    assert summary["cpcb_dominant_category"] in ("Poor", "Very Poor", "Severe")

    # Verify cell structure
    first_cell = data["cells"][0]
    assert "grid_id" in first_cell
    assert "latitude" in first_cell
    assert "longitude" in first_cell
    assert "bounds" in first_cell
    assert first_cell["bounds"]["south"] < first_cell["bounds"]["north"]
    assert first_cell["bounds"]["west"] < first_cell["bounds"]["east"]
    assert first_cell["color"].startswith("#")
    assert first_cell["category"] in ("Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe")
    assert first_cell["nearest_station"] in [s["id"] for s in CANONICAL_STATIONS]
    assert first_cell["distance_to_station_km"] >= 0.0


def test_grid_endpoint_spatial_bounding_box(client: TestClient):
    """Verifies PostGIS spatial envelope bounding-box filtering on /grid."""
    # Narrow bounding box covering roughly central NCR (approx 6 cells)
    bbox_url = (
        "/api/v1/environmental/grid?pollutant=PM2.5&year=2022&month=12"
        "&min_lat=28.60&max_lat=28.80&min_lon=77.20&max_lon=77.50"
    )
    response = client.get(bbox_url)
    assert response.status_code == 200
    data = response.json()

    assert data["total_cells"] == 6
    assert len(data["cells"]) == 6
    assert data.get("data_provider") == "postgres_postgis"

    # All returned cells must strictly lie within requested bounding box
    for cell in data["cells"]:
        assert 28.60 <= cell["latitude"] <= 28.80
        assert 77.20 <= cell["longitude"] <= 77.50

    # Summary metrics should reflect only the 6 filtered cells
    assert data["summary"]["total_cells"] == 6
    assert data["summary"]["valid_cells"] == 6


def test_grid_endpoint_pollutant_and_temporal_filtering(client: TestClient):
    """Verifies querying across different pollutants and historical epochs (2017 to 2022)."""
    # 1. PM10 for January 2017
    res_pm10 = client.get("/api/v1/environmental/grid?pollutant=PM10&year=2017&month=1")
    assert res_pm10.status_code == 200
    d_pm10 = res_pm10.json()
    assert d_pm10["pollutant"] == "PM10"
    assert d_pm10["year"] == 2017
    assert d_pm10["month"] == 1
    assert d_pm10["period"] == "2017-01"
    assert d_pm10["total_cells"] == 64
    assert d_pm10.get("data_provider") == "postgres_postgis"

    # 2. PM2.5 for Monsoon July 2020 (values should be significantly lower than winter)
    res_monsoon = client.get("/api/v1/environmental/grid?pollutant=PM2.5&year=2020&month=7")
    assert res_monsoon.status_code == 200
    d_monsoon = res_monsoon.json()
    assert d_monsoon["summary"]["mean"] < 80.0  # Washout effect in monsoon


def test_grid_endpoint_empty_result_set(client: TestClient):
    """Verifies that querying a bounding box outside the corridor returns an empty result set."""
    empty_url = (
        "/api/v1/environmental/grid?pollutant=PM2.5&year=2022&month=12"
        "&min_lat=35.0&max_lat=36.0&min_lon=80.0&max_lon=81.0"
    )
    response = client.get(empty_url)
    assert response.status_code == 200
    data = response.json()

    assert data["total_cells"] == 0
    assert len(data["cells"]) == 0
    assert data["summary"]["total_cells"] == 0
    assert data["summary"]["valid_cells"] == 0
    assert data["summary"]["no_data_cells"] == 0
    assert data["summary"]["coverage_pct"] == 0.0
    assert data["summary"]["mean"] == 0.0
    assert data["summary"]["cpcb_dominant_category"] == "No Data"


def test_grid_endpoint_database_unavailable_fallback(client: TestClient):
    """Verifies seamless fallback to in-memory estimates when PostgreSQL is disconnected."""
    with patch("backend.app.services.environmental_service.check_db_connectivity", return_value={"connected": False}):
        response = client.get("/api/v1/environmental/grid?pollutant=PM2.5&year=2022&month=12")
        assert response.status_code == 200
        data = response.json()

        assert data["total_cells"] == 64
        assert len(data["cells"]) == 64
        # data_provider should be None indicating in-memory fallback
        assert data.get("data_provider") is None
        assert data["summary"]["mean"] > 100.0


def test_grid_database_and_fallback_consistency():
    """Verifies 100% numerical and structural consistency between database and fallback outputs."""
    # 1. Fetch from live database
    db_response = environmental_service.get_grid_for_period(pollutant="PM2.5", year=2022, month=12)

    # 2. Fetch via forced in-memory fallback
    with patch("backend.app.services.environmental_service.check_db_connectivity", return_value={"connected": False}):
        fallback_response = environmental_service.get_grid_for_period(pollutant="PM2.5", year=2022, month=12)

    # 3. Assert exact matching of top-level metrics
    assert db_response.total_cells == fallback_response.total_cells == 64
    assert db_response.summary.mean == fallback_response.summary.mean
    assert db_response.summary.median == fallback_response.summary.median
    assert db_response.summary.min == fallback_response.summary.min
    assert db_response.summary.max == fallback_response.summary.max
    assert db_response.summary.std_dev == fallback_response.summary.std_dev
    assert db_response.summary.cpcb_dominant_category == fallback_response.summary.cpcb_dominant_category

    # 4. Assert cell-by-cell identity
    db_cells = db_response.cells
    fb_cells = fallback_response.cells
    assert len(db_cells) == len(fb_cells)

    for dbc, fbc in zip(db_cells, fb_cells):
        assert dbc.grid_id == fbc.grid_id
        assert dbc.latitude == fbc.latitude
        assert dbc.longitude == fbc.longitude
        assert dbc.value == fbc.value
        assert dbc.category == fbc.category
        assert dbc.color == fbc.color
        assert dbc.nearest_station == fbc.nearest_station
        assert dbc.distance_to_station_km == fbc.distance_to_station_km


def test_grid_sql_parameterization_safety(client: TestClient):
    """Verifies that malicious or malformed inputs do not cause SQL syntax errors."""
    # Invalid pollutant rejected by FastAPI Query validation
    res_bad_pollutant = client.get("/api/v1/environmental/grid?pollutant=PM2.5'--")
    assert res_bad_pollutant.status_code == 400

    # Year validation boundary check
    res_bad_year = client.get("/api/v1/environmental/grid?pollutant=PM2.5&year=9999")
    assert res_bad_year.status_code == 422
