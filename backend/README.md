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

## 5. PostgreSQL + PostGIS Foundation & Docker Compose

RailAir Intelligence includes a reproducible PostgreSQL 16 + PostGIS 3.4 container environment managed via Docker Compose.

### 5.1 Quick Start
```bash
# 1. Start PostGIS container in background
docker compose up -d

# 2. Verify container health
docker compose ps
# Expected status: railair-postgis Up (healthy) on 0.0.0.0:5432

# 3. Check migration status
python -m backend.app.db.migrator --status

# 4. Apply all schema migrations (idempotent)
python -m backend.app.db.migrator --apply

# 5. Ingest historical 10 km gridded PM2.5/PM10 dataset (9,216 records)
python -m backend.app.db.ingest_historical
```

### 5.2 Container Lifecycle Commands
- **Start:** `docker compose up -d`
- **Stop:** `docker compose stop`
- **Restart:** `docker compose restart`
- **Tear Down (Preserves Data Volume):** `docker compose down`
- **Logs:** `docker compose logs -f db`
- **Interactive SQL Shell:** `docker exec -it railair-postgis psql -U postgres -d railair_db`

### 5.3 Schema Migrations Engine
The migration runner (`backend.app.db.migrator`) ensures transaction safety and tracks executed migrations in `schema_migrations`:
- `python -m backend.app.db.migrator --status` — View applied and pending migrations.
- `python -m backend.app.db.migrator --apply` — Sequentially executes unapplied migrations.
- `python -m backend.app.db.migrator --reset --confirm` — Resets public schema and reapplies migrations (DEVELOPMENT ONLY; requires explicit confirmation).

Applied migrations:
1. `001_initial_schema.sql` — PostGIS extension, `stations` table with canonical station IDs and official Indian Railways `ir_code`, `pollutant_observations`, `corridors`, and `corridor_segments`.
2. `002_environmental_schema.sql` — `environmental_datasets`, `environmental_ground_observations` (CAAQMS telemetry), `environmental_gridded_estimates` (10 km rasters), `meteorological_observations`, and `environmental_ingestion_runs`.

### 5.4 Historical Environmental Ingestion
Ingests monthly 10 km PM2.5 and PM10 estimates from Zenodo Collection 2 (64 grid cells × 72 months = 9,216 records):
- **Dry-run validation:** `python -m backend.app.db.ingest_historical --dry-run`
- **Active ingestion:** `python -m backend.app.db.ingest_historical`
- **Custom batch size:** `python -m backend.app.db.ingest_historical --batch-size 500`

The ingestion is 100% idempotent (`ON CONFLICT (id) DO UPDATE`), preserves NULL values and units (`µg/m³`), populates PostGIS `Point` geometry, and records run provenance in `environmental_ingestion_runs`.

### 5.5 Troubleshooting
1. **Port 5432 Conflict:**
   If a local PostgreSQL service is already occupying port 5432, set `POSTGRES_PORT=5433` in `.env` and `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/railair_db`.
2. **Container Not Healthy:**
   Run `docker compose logs db` to inspect PostgreSQL startup logs.
3. **Database Fallback:**
   If PostgreSQL is stopped or unreachable, the backend automatically logs a warning and falls back to deterministic in-memory simulation mode without crashing.
4. **Data Reset Without Volume Deletion:**
   Run `python -m backend.app.db.migrator --reset --confirm` to drop only public tables and reapply schema cleanly. Do not use `docker volume rm railair_pgdata` unless a complete disk wipe is intended.

---

## 6. API Endpoints Contract

### Health Check
`GET /api/v1/health`
When PostgreSQL/PostGIS is running:
```json
{
  "status": "healthy",
  "service": "RailAir Intelligence Backend",
  "version": "0.1.0",
  "environment": "development",
  "database": {
    "connected": true,
    "mode": "postgres",
    "detail": "Connected to PostgreSQL 16.4 with PostGIS 3.4 on localhost:5432/railair_db."
  }
}
```
When running standalone without PostgreSQL:
```json
{
  "status": "healthy",
  "service": "RailAir Intelligence Backend",
  "version": "0.1.0",
  "environment": "development",
  "database": {
    "connected": false,
    "mode": "standalone_synthetic",
    "detail": "DATABASE_URL not configured. Running in in-memory simulation mode."
  }
}
```

### Historical Gridded Particulate Surface Estimates (Database-Backed)
`GET /api/v1/environmental/gridded/corridor`
- Query Params: `?pollutant=PM2.5&year=2022&month=12&limit=50&offset=0`
- Bounding Box Params: `?min_lat=28.45&max_lat=29.20&min_lon=77.10&max_lon=77.90` (uses PostGIS spatial index)
- Response includes `data_provider: "postgres_postgis"` when served from PostGIS, or falls back seamlessly to in-memory if database is offline.

### Stations & Corridors
- `GET /api/v1/stations` — List 7 canonical stations with internal `id` and official railway `ir_code`.
- `GET /api/v1/stations/{id}` — Single station metadata and observation readings.
- `GET /api/v1/corridor` — Full corridor geometry and synthetic exposure profile.
