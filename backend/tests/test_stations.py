from fastapi.testclient import TestClient


def test_list_all_stations_returns_canonical_nodes(client: TestClient) -> None:
    response = client.get("/api/v1/stations")
    assert response.status_code == 200
    stations = response.json()

    assert len(stations) == 7
    station_ids = [s["id"] for s in stations]
    expected_ids = ["MRT", "MMU", "MNR", "GZB", "SAH", "DSO", "NDLS"]
    assert station_ids == expected_ids


def test_station_schema_and_geospatial_coordinates(client: TestClient) -> None:
    response = client.get("/api/v1/stations")
    assert response.status_code == 200
    stations = response.json()

    for s in stations:
        assert "id" in s
        assert "name" in s
        assert "shortName" in s
        assert "type" in s
        assert s["type"] in ["major", "halt", "junction", "terminal"]
        assert "distanceFromOriginKm" in s
        assert s["distanceFromOriginKm"] >= 0

        # Geospatial WGS84 coordinate bounds
        pos = s["position"]
        assert 28.0 <= pos["lat"] <= 29.5
        assert 77.0 <= pos["lng"] <= 78.0


def test_station_synthetic_provenance_marking(client: TestClient) -> None:
    response = client.get("/api/v1/stations")
    assert response.status_code == 200
    stations = response.json()

    for s in stations:
        prov = s["provenance"]
        assert prov["dataKind"] == "simulated"
        assert prov["confidence"] in ["low", "medium", "high", "very-low"]
        assert 0.0 <= prov["confidenceScore"] <= 1.0
        assert "Simulation Engine" in prov["source"]
        assert "No real monitoring instruments" in prov["notes"]

        # Ensure observation records are also explicitly tagged
        for obs in s["observations"]:
            assert obs["provenance"]["dataKind"] == "simulated"
            assert obs["unit"] == "µg/m³"
            assert obs["value"] > 0
            assert obs["pollutant"] in ["PM2.5", "PM10", "NO2", "CO"]


def test_get_station_by_id_success(client: TestClient) -> None:
    # Test New Delhi Railway Station
    response = client.get("/api/v1/stations/NDLS")
    assert response.status_code == 200
    station = response.json()

    assert station["id"] == "NDLS"
    assert station["name"] == "New Delhi Railway Station"
    assert station["shortName"] == "New Delhi"
    assert station["type"] == "terminal"
    assert station["distanceFromOriginKm"] == 83.0
    assert station["platforms"] == "16 Platforms"

    obs_map = {o["pollutant"]: o["value"] for o in station["observations"]}
    assert obs_map["PM2.5"] == 168.0
    assert obs_map["PM10"] == 289.0


def test_get_station_case_insensitivity(client: TestClient) -> None:
    response = client.get("/api/v1/stations/mrt")
    assert response.status_code == 200
    station = response.json()
    assert station["id"] == "MRT"
    assert station["shortName"] == "Meerut"


def test_get_station_unknown_returns_404(client: TestClient) -> None:
    response = client.get("/api/v1/stations/UNKNOWN_999")
    assert response.status_code == 404
    error_data = response.json()
    assert "detail" in error_data
    assert "UNKNOWN_999" in error_data["detail"]


def test_list_stations_filtered_by_type(client: TestClient) -> None:
    response = client.get("/api/v1/stations?type=junction")
    assert response.status_code == 200
    stations = response.json()
    # GZB and SAH are junctions
    assert len(stations) == 2
    assert {s["id"] for s in stations} == {"GZB", "SAH"}


def test_list_stations_filtered_by_pollutant(client: TestClient) -> None:
    response = client.get("/api/v1/stations?pollutant=PM2.5")
    assert response.status_code == 200
    stations = response.json()
    # All 7 stations have PM2.5 readings
    assert len(stations) == 7
