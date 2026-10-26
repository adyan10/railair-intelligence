import pytest
from fastapi.testclient import TestClient
from backend.app.main import create_app


@pytest.fixture(scope="session")
def client() -> TestClient:
    """Fixture providing a test client for FastAPI endpoints."""
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client
