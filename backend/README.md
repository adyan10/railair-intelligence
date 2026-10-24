# RailAir Intelligence — Backend Foundation (Phase 1)

FastAPI + PostgreSQL/PostGIS backend service providing railway particulate intelligence and atmospheric exposure calculations along national railway corridors.

---

## 1. Architecture & Design Principles

- **FastAPI Core:** Modern asynchronous web framework with Pydantic v2 data validation and auto-generated OpenAPI documentation.
- **Geospatial Data Modeling:** PostGIS geography/geometry (`Point` for stations, `LineString` for track segments, EPSG:4326).
- **Synthetic Data Provenance Policy:** All baseline readings are explicitly tagged with `dataKind: "simulated"` and simulation provenance metadata. Model outputs are never conflated with live CPCB sensor telemetry.
- **Database Independence:** The service operates in standalone synthetic mode by default using canonical seed datasets, ensuring development and testing run reliably without requiring a running PostgreSQL database. When a PostGIS database is configured and available, it can connect and execute spatial queries.

---

## 2. Directory Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI app factory, CORS, router mounting
│   ├── config.py                   # Pydantic BaseSettings (env, CORS, DB URL)
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py           # V1 API router
│   │       └── endpoints/
│   │           ├── __init__.py
│   │           ├── health.py       # GET /api/v1/health
│   │           ├── stations.py     # GET /api/v1/stations & /api/v1/stations/{id}
│   │           └── corridor.py     # GET /api/v1/corridor
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py              # Pydantic v2 schemas for request/response models
│   ├── db/
│   │   ├── __init__.py
│   │   ├── session.py              # Non-blocking DB status & session manager
│   │   ├── seed_data.py            # Canonical deterministic seed dataset
│   │   └── migrations/
│   │       └── 001_initial_schema.sql  # Reproducible PostgreSQL + PostGIS SQL
│   └── services/
│       ├── __init__.py
│       └── station_service.py      # Station & corridor domain service
├── tests/
│   ├── __init__.py
│   ├── conftest.py                 # Pytest TestClient fixture
│   ├── test_health.py              # Health check & standalone mode tests
│   ├── test_stations.py            # Station listing, filtering, 404 tests
│   └── test_corridor.py            # Corridor route & segments tests
├── requirements.txt                # Pinned/bounded Python dependencies
├── .env.example                    # Environment variable template
└── README.md                       # Backend documentation
```

---

## 3. Local Development & Setup

### Prerequisites
- Python 3.11+
- (Optional for full DB persistence) PostgreSQL 15+ with PostGIS 3+

### Step 1: Virtual Environment Setup
```bash
# Create virtual environment
python -m venv .venv

# Activate on Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Or on Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

### Step 2: Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp backend/.env.example .env
```

### Step 3: Run the FastAPI Development Server
```bash
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

- Interactive OpenAPI Swagger UI: `http://127.0.0.1:8000/api/v1/docs`
- ReDoc UI: `http://127.0.0.1:8000/api/v1/redoc`
- Health Endpoint: `http://127.0.0.1:8000/api/v1/health`

---

## 4. Testing

Run backend tests using pytest:
```bash
# Run all backend tests
pytest backend/tests -v

# Run with coverage (if pytest-cov installed)
pytest backend/tests --cov=backend.app
```

---

## 5. API Endpoints Contract

### Health Check
`GET /api/v1/health`
```json
{
  "status": "healthy",
  "service": "RailAir Intelligence Backend",
  "version": "0.1.0",
  "environment": "development",
  "database": {
    "connected": false,
    "mode": "standalone_synthetic",
    "detail": "Database engine not initialized (local PostgreSQL service not detected). Using deterministic seed provider."
  }
}
```

### Stations
- `GET /api/v1/stations` — List all 7 corridor stations.
  - Optional Query Params: `?type=junction`, `?pollutant=PM2.5`
- `GET /api/v1/stations/{station_id}` — Get single station by ID (e.g. `NDLS`, `MRT`). Returns 404 if not found.

### Corridor
- `GET /api/v1/corridor` — Returns full route definition, ordered station sequence, contiguous segment track paths, and synthetic particulate exposure estimates.

---

## 6. PostgreSQL + PostGIS Schema & Migrations

To initialize a local PostgreSQL database with spatial extensions:
```bash
# Ensure PostgreSQL with PostGIS is installed
psql -U postgres -c "CREATE DATABASE railair_db;"
psql -U postgres -d railair_db -f backend/app/db/migrations/001_initial_schema.sql
```

The migration automatically creates:
1. `postgis` spatial extension
2. `provenance_records` table
3. `stations` table with PostGIS `Point` geometry and spatial GiST index
4. `pollutant_observations` table with foreign key to `stations` and check constraints
5. `corridors` and `corridor_segments` tables with `LineString` track geometry
6. Deterministic baseline seed records matching the frontend simulation
