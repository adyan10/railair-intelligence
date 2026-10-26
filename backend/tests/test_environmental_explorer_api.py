"""
RailAir Intelligence — Environmental Explorer & Command Centre API Tests.

Validates the continuous historical gridded PM2.5/PM10 engine (Zenodo Collection 2):
1. Catalogue & metadata (/variables, /bounds, /coverage).
2. Historical time index (/periods: 72 monthly slices, 2017–2022).
3. 64-cell contiguous 10 km grid delivery (/grid).
4. Statistical summaries & CPCB severity classification (/summary).
5. 72-month historical time series & seasonal variance (/timeseries).
6. Hotspot ranking across the regional grid (/hotspots).
7. Coordinate inspection and nearest station proximity (/inspect).
8. Rail corridor microenvironment comparison across 7 stations (/corridor-comparison).
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_get_environmental_variables():
    response = client.get("/api/v1/environmental/variables")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    variables = [item["variable"] for item in data]
    assert "PM2.5" in variables
    assert "PM10" in variables
    for item in data:
        assert item["unit"] == "µg/m³"
        assert item["spatial_resolution"] == "10km"
        assert "source_dataset" in item


def test_get_available_periods():
    # PM2.5 periods
    response = client.get("/api/v1/environmental/periods?pollutant=PM2.5")
    assert response.status_code == 200
    data = response.json()
    assert data["dataset_id"] == "zenodo_gridded_pm_v2"
    assert data["pollutant"] == "PM2.5"
    assert data["total_periods"] == 72
    assert len(data["periods"]) == 72
    assert data["periods"][0]["period"] == "2017-01"
    assert data["periods"][-1]["period"] == "2022-12"

    # PM10 periods
    response_pm10 = client.get("/api/v1/environmental/periods?pollutant=PM10")
    assert response_pm10.status_code == 200
    assert response_pm10.json()["total_periods"] == 72

    # Invalid pollutant
    response_bad = client.get("/api/v1/environmental/periods?pollutant=INVALID")
    assert response_bad.status_code == 400


def test_get_spatial_bounds():
    response = client.get("/api/v1/environmental/bounds")
    assert response.status_code == 200
    data = response.json()
    assert data["crs"] == "EPSG:4326 (WGS84)"
    assert data["grid_shape"]["total_cells"] == 64
    assert data["bounds"]["min_lat"] == 28.45
    assert data["bounds"]["max_lat"] == 29.20
    assert data["bounds"]["min_lon"] == 77.10
    assert data["bounds"]["max_lon"] == 77.90
    assert len(data["canonical_corridor"]["stations"]) == 7


def test_get_gridded_layer():
    # Query December 2022 (winter peak)
    response = client.get("/api/v1/environmental/grid?pollutant=PM2.5&year=2022&month=12")
    assert response.status_code == 200
    data = response.json()
    assert data["pollutant"] == "PM2.5"
    assert data["year"] == 2022
    assert data["month"] == 12
    assert data["total_cells"] == 64
    assert len(data["cells"]) == 64

    # Verify summary metrics
    summary = data["summary"]
    assert summary["valid_cells"] == 64
    assert summary["no_data_cells"] == 0
    assert summary["coverage_pct"] == 100.0
    assert summary["mean"] > 100.0  # Winter in Delhi NCR exceeds 100 µg/m³
    assert summary["max"] >= summary["min"]
    assert summary["cpcb_dominant_category"] in ("Very Poor", "Severe", "Poor")

    # Verify cell bounds and coloring
    first_cell = data["cells"][0]
    assert "bounds" in first_cell
    assert first_cell["bounds"]["south"] < first_cell["bounds"]["north"]
    assert first_cell["bounds"]["west"] < first_cell["bounds"]["east"]
    assert first_cell["color"].startswith("#")
    assert first_cell["category"] in ("Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe")


def test_get_timeseries():
    response = client.get("/api/v1/environmental/timeseries?grid_id=grid_28.67_77.24&pollutant=PM2.5")
    assert response.status_code == 200
    data = response.json()
    assert data["pollutant"] == "PM2.5"
    assert data["grid_id"] == "grid_28.67_77.24"
    assert data["total_points"] == 72
    assert len(data["timeseries"]) == 72
    assert data["timeseries"][0]["period"] == "2017-01"
    assert data["timeseries"][-1]["period"] == "2022-12"

    # Winter peak must be higher than monsoon dip in Delhi NCR
    assert data["winter_peak_mean"] > data["monsoon_dip_mean"]
    assert data["overall_max"] > data["overall_min"]


def test_get_hotspots():
    response = client.get("/api/v1/environmental/hotspots?pollutant=PM2.5&year=2022&month=12&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert data["pollutant"] == "PM2.5"
    assert data["period"] == "2022-12"
    assert data["total_hotspots"] == 5
    items = data["items"]
    assert len(items) == 5
    # Must be sorted descending by value
    for i in range(len(items) - 1):
        assert items[i]["value"] >= items[i + 1]["value"]
        assert items[i]["rank"] == i + 1


def test_inspect_location():
    # Click near New Delhi Railway Station (28.6429, 77.2195)
    response = client.get("/api/v1/environmental/inspect?lat=28.6429&lon=77.2195&pollutant=PM2.5&year=2022&month=12")
    assert response.status_code == 200
    data = response.json()
    assert data["pollutant"] == "PM2.5"
    assert data["period"] == "2022-12"
    assert data["grid_id"].startswith("grid_")
    assert data["value"] is not None
    assert data["distance_to_query_km"] < 15.0
    assert len(data["timeseries"]) == 72


def test_corridor_comparison():
    response = client.get("/api/v1/environmental/corridor-comparison?pollutant=PM2.5&year=2022&month=12")
    assert response.status_code == 200
    stations = response.json()
    assert len(stations) == 7
    station_ids = [s["station_id"] for s in stations]
    assert station_ids == ["MRT", "MMU", "MNR", "GZB", "SAH", "DSO", "NDLS"]

    # Verify official Indian Railways CRIS station code mappings
    ir_codes = {s["station_id"]: s.get("ir_code") for s in stations}
    assert ir_codes == {
        "MRT": "MTC",
        "MMU": "MDNR",
        "MNR": "MUD",
        "GZB": "GZB",
        "SAH": "SBB",
        "DSO": "DSA",
        "NDLS": "NDLS",
    }

    for s in stations:
        assert s["ambient_grid_value"] is not None
        assert s["distance_to_cell_km"] < 15.0


def test_coverage_status():
    response = client.get("/api/v1/environmental/coverage")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["primary_dataset"] == "zenodo_gridded_pm_v2"
    assert data["metrics"]["gridded_corridor_estimates"]["total_cells_extracted"] == 9216
