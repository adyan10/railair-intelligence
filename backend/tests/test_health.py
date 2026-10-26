from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "RailAir Intelligence Backend"
    assert "version" in data
    assert "provenanceNotice" in data
    assert "CPCB" in data["provenanceNotice"]


def test_health_endpoint_schema_and_standalone_mode(client: TestClient, monkeypatch) -> None:
    # Explicitly test graceful standalone fallback when database is unavailable
    monkeypatch.setattr(
        "backend.app.api.v1.endpoints.health.check_db_connectivity",
        lambda: {
            "connected": False,
            "mode": "standalone_synthetic",
            "detail": "DATABASE_URL not configured. Running in in-memory simulation mode.",
        },
    )
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


def test_health_endpoint_live_database_mode(client: TestClient) -> None:
    """Verifies live database connectivity diagnostics when PostgreSQL/PostGIS is running."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "healthy"
    assert "database" in data
    assert data["database"]["connected"] is True
    assert data["database"]["mode"] == "postgres"
    assert "PostgreSQL" in data["database"]["detail"]
    assert "PostGIS" in data["database"]["detail"]
