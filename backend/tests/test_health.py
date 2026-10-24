from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "RailAir Intelligence Backend"
    assert "version" in data
    assert "provenanceNotice" in data
    assert "CPCB" in data["provenanceNotice"]


def test_health_endpoint_schema_and_standalone_mode(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "healthy"
    assert data["service"] == "RailAir Intelligence Backend"
    assert data["version"] == "0.1.0"
    assert data["environment"] == "development"

    # Verifies graceful standalone operation without hard database crash
    assert "database" in data
    assert data["database"]["connected"] is False
    assert data["database"]["mode"] == "standalone_synthetic"
    assert "detail" in data["database"]
