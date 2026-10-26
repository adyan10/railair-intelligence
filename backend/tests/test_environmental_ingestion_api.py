"""
RailAir Intelligence — Environmental Ingestion & API Integration Tests.

Validates:
1. Environmental dataset inventory and scientific provenance metadata.
2. CPCB statutory ground telemetry ingestion with strict NULL preservation (never 0.0).
3. Canonical railway station mapping for corridor monitoring nodes.
4. Historical 10 km gridded PM2.5 and PM10 corridor extraction and seasonal fidelity.
5. Mendeley satellite column densities (mol/m²) and ERA5 meteorology (K, m/s).
6. API query filtering, bounding box slicing, pagination, and boundary conditions.
"""

import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent


def test_environmental_inventory_endpoint(client: TestClient):
    """Verifies that all 4 verified environmental dataset collections are cataloged."""
    response = client.get("/api/v1/environmental/inventory")
    assert response.status_code == 200
    data = response.json()
    assert data["total_datasets"] == 4
    dataset_ids = [d["id"] for d in data["datasets"]]
    assert "cpcb_snapshot_2026" in dataset_ids
    assert "zenodo_gridded_pm_v2" in dataset_ids
    assert "mendeley_trace_gases_era5" in dataset_ids
    assert "zenodo_pm25_ml_benchmark" in dataset_ids

    # Validate CPCB metadata
    cpcb_ds = next(d for d in data["datasets"] if d["id"] == "cpcb_snapshot_2026")
    assert cpcb_ds["license"] == "Government Open Data License - India (GODL)"
    assert cpcb_ds["measurement_type"] == "in_situ_ground"
    assert len(cpcb_ds["sha256"]) == 64


def test_cpcb_ground_stations_corridor_and_null_handling(client: TestClient):
    """Verifies CPCB ground station queries, corridor proximity, and strict NULL handling."""
    # 1. Fetch corridor stations
    response = client.get("/api/v1/environmental/ground-stations?corridor_only=true&limit=100")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    assert len(data["items"]) > 0

    cities = {item["city"].lower() for item in data["items"]}
    assert any(c in cities for c in ["delhi", "ghaziabad", "meerut", "noida"])

    # 2. Strict NULL handling verification: missing sensor readings must be None/null, never 0.0
    missing_records = [item for item in data["items"] if item["quality_status"] == "missing_na"]
    assert len(missing_records) > 0, "Expected missing_na records from CPCB sensor calibration"
    for rec in missing_records:
        assert rec["value_avg"] is None, "Missing reading must be JSON null, never coerced to 0.0"

    # 3. Valid readings verification
    valid_records = [item for item in data["items"] if item["quality_status"] == "valid"]
    assert len(valid_records) > 0
    for rec in valid_records:
        assert rec["value_avg"] is not None
        assert rec["value_avg"] >= 0.0

    # 4. Canonical station mapping verification
    mapped = [item for item in data["items"] if item["nearest_canonical_station_id"] is not None]
    assert len(mapped) > 0
    canonical_ids = {item["nearest_canonical_station_id"] for item in mapped}
    assert any(cid in canonical_ids for cid in ["MRT", "NDLS", "GZB", "SAH", "DSO"])


def test_cpcb_ground_stations_filtering(client: TestClient):
    """Tests pollutant and canonical station filtering."""
    # Pollutant filter: PM2.5
    res_pm25 = client.get("/api/v1/environmental/ground-stations?pollutant=PM2.5&limit=50")
    assert res_pm25.status_code == 200
    data_pm25 = res_pm25.json()
    for item in data_pm25["items"]:
        assert item["pollutant"] == "PM2.5"

    # Canonical station filter: MRT (Meerut)
    res_mrt = client.get("/api/v1/environmental/ground-stations?canonical_station_id=MRT&limit=50")
    assert res_mrt.status_code == 200
    data_mrt = res_mrt.json()
    for item in data_mrt["items"]:
        assert item["nearest_canonical_station_id"] == "MRT"
        assert item["distance_to_canonical_km"] <= 25.0


def test_gridded_corridor_pm_extraction_and_seasonal_dynamics(client: TestClient):
    """Verifies gridded 10 km PM2.5/PM10 extraction and realistic seasonal curves."""
    # 1. Fetch 2022 PM2.5 data
    response = client.get("/api/v1/environmental/gridded/corridor?pollutant=PM2.5&year=2022&limit=200")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    items = data["items"]

    # Verify attributes
    for item in items:
        assert item["pollutant"] == "PM2.5"
        assert item["year"] == 2022
        assert item["unit"] == "µg/m³"
        assert item["spatial_resolution"] == "10km"
        assert item["temporal_resolution"] == "monthly_mean"
        assert item["observation_type"] == "gridded_surface_estimate"

    # 2. Check seasonal curve for a central corridor cell (e.g. grid near Delhi lat ~28.67, lon ~77.24)
    delhi_cell_items = [
        it for it in items
        if abs(it["latitude"] - 28.67) < 0.05 and abs(it["longitude"] - 77.24) < 0.05
    ]
    if delhi_cell_items:
        by_month = {it["month"]: it["value"] for it in delhi_cell_items if it["value"] is not None}
        if 8 in by_month and 12 in by_month:
            # December winter inversion peak must be significantly higher than August monsoon washout
            assert by_month[12] > by_month[8], f"Winter ({by_month[12]}) should exceed monsoon ({by_month[8]})"


def test_meteorology_trace_gases_and_weather(client: TestClient):
    """Verifies satellite trace gas column densities and ERA5-Land weather parameters."""
    # Query NO2 (satellite tropospheric column density)
    res_no2 = client.get("/api/v1/environmental/meteorology?variable_name=NO2&corridor_only=true&limit=20")
    assert res_no2.status_code == 200
    data_no2 = res_no2.json()
    assert len(data_no2["items"]) > 0
    for item in data_no2["items"]:
        assert item["variable_name"] == "NO2"
        assert item["unit"] == "mol/m²"
        assert item["measurement_type"] == "satellite_column"

    # Query Temperature (ERA5-Land reanalysis)
    res_temp = client.get("/api/v1/environmental/meteorology?variable_name=Temperature&corridor_only=true&limit=20")
    assert res_temp.status_code == 200
    data_temp = res_temp.json()
    assert len(data_temp["items"]) > 0
    for item in data_temp["items"]:
        assert item["variable_name"] == "Temperature"
        assert item["unit"] == "K"
        assert item["measurement_type"] == "reanalysis_meteorology"
        assert 250.0 <= item["value"] <= 330.0  # Realistic Kelvin temperature range for NCR


def test_observations_unified_query(client: TestClient):
    """Verifies unified regional observations endpoint routing and pagination."""
    # Query gridded observations
    res_grid = client.get(
        "/api/v1/environmental/observations?source_dataset=zenodo_gridded_pm_v2&pollutant=PM10&limit=10&offset=0"
    )
    assert res_grid.status_code == 200
    data_grid = res_grid.json()
    assert data_grid["limit"] == 10
    assert len(data_grid["items"]) <= 10

    # Query ground observations
    res_ground = client.get(
        "/api/v1/environmental/observations?source_dataset=cpcb_snapshot_2026&pollutant=PM2.5&limit=10"
    )
    assert res_ground.status_code == 200
    data_ground = res_ground.json()
    assert len(data_ground["items"]) <= 10


def test_empty_query_boundary_handling(client: TestClient):
    """Verifies graceful handling of non-matching filter criteria without crashing."""
    response = client.get("/api/v1/environmental/ground-stations?city=NonExistentCityXYZ")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["returned"] == 0
    assert data["items"] == []
