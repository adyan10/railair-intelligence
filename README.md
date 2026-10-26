# RailAir Intelligence — Environmental Intelligence Platform

[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2B%20PostGIS%203.4-336791.svg)](https://postgis.net/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-slate.svg)]()

> **Evidence-based environmental intelligence, out-of-sample statistical forecasting, and statutory air-quality health risk assessment along Indian Railways transit corridors.**

---

## 1. Project Overview & Purpose

**RailAir Intelligence** links India's rail transport corridors with multi-source environmental datasets to quantify air-pollution exposure for passengers, transit operators, and urban policymakers.

Historically, environmental monitoring and transit planning have operated in silos:
- Ground-level Continuous Ambient Air Quality Monitoring Stations (**CAAQMS**) operated by the Central Pollution Control Board (**CPCB**) provide high-precision localized snapshots, but suffer from spatial gaps between transit junctions.
- High-resolution atmospheric reanalysis models (such as the IIT Delhi gridded satellite-derived aerosol series) offer continuous spatial coverage across India, but operate on sub-chronic monthly intervals rather than instantaneous operational timescales.
- Passenger journey planners quantify travel time and ticket fares while ignoring cumulative inhalation dosage across travel classes (AC vs. Non-AC) and diurnal exposure windows.

RailAir Intelligence reconciles these sources along the flagship **New Delhi (NDLS) – Howrah (HWH)** trunk corridor (1,530 km, 185 stations), providing:
1. Geospatial corridor analysis using PostGIS spatial indexes and bounding corridor buffers.
2. Climatological anomaly detection and seasonal analysis across Indian meteorological cycles.
3. Out-of-sample statistical forecasting with held-out chronological validation and prediction intervals.
4. Deterministic health-risk advisory engine strictly aligned with **CPCB NAAQS (2009)** statutory standards, featuring temporal averaging-period compatibility safeguards.

---

## 2. Key Capabilities

- **Interactive Corridor Map & Geospatial Buffers**: Visualizes the 1,530 km NDLS–HWH trunk line with a 25 km spatial corridor buffer, querying 185 reconciled railway stations and surrounding CPCB monitoring stations.
- **Multi-Source Environmental Fusion**:
  - *Modelled Gridded Atmospheric Data*: 72 monthly periods (2017–2022) at 0.1° resolution from satellite AOD and chemical transport models (`zeonodo-data2`).
  - *Observed Ground Telemetry*: Statutory ground sensor snapshots from CPCB CAAQMS stations (`cpcb_snapshot_2026`).
- **Statistical Environmental Analysis Engine**:
  - Full descriptive statistics (Mean, Median, Standard Deviation, IQR, 25th/75th percentiles).
  - Strict null preservation (missing sensor observations are never coerced to zero).
  - Indian meteorological seasonal breakdown (Winter, Pre-Monsoon, Monsoon, Post-Monsoon).
  - Multi-year 12-month climatological baseline with standardized z-score anomaly detection.
- **Out-of-Sample Statistical Forecasting**:
  - 1-to-12 month recursive autoregressive forecasting using Seasonal Persistence and 12-Month Climatology models.
  - Leakage-free chronological evaluation: trained on 2017–2021 (60 months) and evaluated on held-out 2022 data (12 months).
  - Dynamic prediction intervals based on out-of-sample residual variance.
- **Statutory Health Risk Advisory Engine (CPCB NAAQS 2009)**:
  - Exact deterministic rule evaluation based on Central Pollution Control Board breakpoints.
  - Strict averaging-period compatibility guards: instantaneous sensor readings are never misrepresented as statutory 24-hour exceedances.
  - Non-clinical guidance for the general public and sensitive populations (pediatric, geriatric, cardiopulmonary).
  - Non-hardcoded confidence semantics (`not_estimated` for exact deterministic rules).
- **Passenger Journey Exposure Calculator**:
  - Cumulative particulate inhalation dosage modeling across trains (Rajdhani, Poorva, Kalka Mail).
  - In-cabin air infiltration factors for air-conditioned (HEPA-filtered) vs. open-window sleeper coaches.

---

## 3. System Architecture & Data Flow

```
                      +-------------------------------------------------------------+
                      |                      Web Frontend (React)                   |
                      |  - Environmental Explorer        - Command Centre           |
                      |  - Environmental AI Modal        - Journey Exposure Planner |
                      +------------------------------+------------------------------+
                                                     |
                                                     | HTTP / REST (Vite Proxy)
                                                     v
                      +-------------------------------------------------------------+
                      |                   FastAPI Backend Service                   |
                      |  - Router: /api/v1/environmental/*                          |
                      |  - Router: /api/v1/environmental/ai/*                       |
                      |  - Pydantic v2 Schemas & Response Serializers               |
                      +------------------------------+------------------------------+
                                                     |
                         +---------------------------+---------------------------+
                         |                                                       |
                         v                                                       v
        +----------------------------------+                   +----------------------------------+
        |   Environmental AI Engine        |                   |   PostgreSQL 16 + PostGIS 3.4    |
        |  - Analysis: Climatology & Z     |                   |  - environmental_grid_cells      |
        |  - Forecast: Seasonal Baselines  |                   |  - environmental_observations    |
        |  - Advisory: CPCB 2009 Standards |                   |  - cpcb_ground_observations      |
        |  - In-Memory Standalone Fallback |                   |  - stations & railway_corridors  |
        +----------------------------------+                   +----------------------------------+
                         |                                                       |
                         +---------------------------+---------------------------+
                                                     |
                                                     v
                                  +-------------------------------------+
                                  |            Data Sources             |
                                  |  1. IIT Delhi NetCDF (2017–2022)    |
                                  |  2. CPCB CAAQMS Sensor Snapshot     |
                                  |  3. Indian Railways Station GeoJSON |
                                  +-------------------------------------+
```

---

## 4. Repository Structure

```
railair-intelligence/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   └── endpoints/
│   │   │       ├── environmental.py           # Core PostGIS environmental routes
│   │   │       ├── environmental_ai.py        # Environmental AI (Analysis, Forecast, Advisory)
│   │   │       ├── stations.py                # Reconciled railway stations
│   │   │       └── corridor.py                # Corridor boundary & geometry
│   │   ├── core/
│   │   │   └── config.py                      # Application settings & environment
│   │   ├── db/
│   │   │   ├── connection.py                  # psycopg2 connection pool & fallback
│   │   │   ├── ingest_cpcb.py                 # CPCB ground-sensor ingestion script
│   │   │   ├── ingest_historical.py           # NetCDF gridded data ingestion
│   │   │   └── migrate.py                     # SQL migration executor
│   │   ├── models/
│   │   │   ├── ai_schemas.py                  # Pydantic models for AI engine
│   │   │   └── environmental_schemas.py       # Pydantic models for spatial endpoints
│   │   └── services/
│   │       ├── environmental_analysis.py      # Climatology, stats, z-scores
│   │       ├── environmental_forecasting.py   # Statistical forecasting & evaluation
│   │       ├── risk_advisory.py               # CPCB NAAQS 2009 deterministic advisory
│   │       └── environmental_service.py       # Database querying & corridor filters
│   ├── migrations/                            # SQL schema migrations (001 to 007)
│   └── tests/                                 # Pytest suite (120 tests)
├── src/
│   ├── components/
│   │   ├── environmental/
│   │   │   ├── EnvironmentalAiModal.tsx       # AI Analytics, Forecast & Advisory UI
│   │   │   ├── EnvironmentalExplorerPage.tsx  # Map, gridded heatmap & station markers
│   │   │   └── GroundStationMarker.tsx        # CPCB ground sensor popups
│   │   └── journey/
│   │       └── JourneyExposureModal.tsx       # Inhalation exposure calculator
│   ├── services/
│   │   └── environmentalApiClient.ts          # Frontend API client with fallback adapters
│   ├── types/
│   │   ├── environmental.ts                   # Core spatial & pollutant types
│   │   └── environmentalAi.ts                 # Environmental AI TypeScript interfaces
│   └── tests/                                 # Vitest suite (109 tests)
├── docker-compose.yml                         # PostgreSQL 16 + PostGIS container definition
├── package.json                               # Frontend dependencies & scripts
├── pytest.ini                                 # Pytest configuration
├── tsconfig.json                              # TypeScript strict configuration
└── vite.config.ts                             # Vite configuration with API reverse proxy
```

---

## 5. Technology Stack

### Frontend
- **Framework**: React 18.3.1
- **Language**: TypeScript 5.5.3 (Strict type checking)
- **Bundler & Tooling**: Vite 5.4.21
- **Styling**: Tailwind CSS 3.4.17, PostCSS 8.4.49, Autoprefixer 10.4.20
- **Data Visualization**: Recharts 2.15.1
- **Icons**: Lucide React 0.344.0
- **Testing**: Vitest 2.1.9

### Backend
- **Framework**: FastAPI 0.115.0
- **ASGI Server**: Uvicorn 0.31.0
- **Data Validation**: Pydantic v2 (2.9.2)
- **Database Driver**: psycopg2-binary 2.9.9 (Connection pooling with graceful in-memory fallback)
- **Spatial Processing**: PostGIS 3.4
- **Testing**: Pytest 9.1.1, Starlette TestClient, httpx

### Database & Infrastructure
- **Container**: Docker Compose (`postgis/postgis:16-3.4`)
- **Spatial Reference System**: WGS 84 (EPSG:4326) / Web Mercator (EPSG:3857)

---

## 6. Local Setup & Prerequisites

### Prerequisites
- **Node.js**: v18.0.0 or higher (Tested on v24.15.0)
- **Python**: v3.11.x (Recommended)
- **Docker & Docker Compose**: (Optional, required only for database-backed mode)
- **Git**: Installed and available in PATH

### Clone Repository
```powershell
git clone https://github.com/adyan10/railair-intelligence.git
cd railair-intelligence
```

### Backend Virtual Environment Setup
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
```

### Frontend Dependencies Setup
```powershell
npm install
```

---

## 7. Environment Variables

The backend and frontend use explicit, documented environment variables with robust defaults:

### Backend (`backend/.env` or system environment)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://railair_user:railair_secure_pass_2026@localhost:5432/railair_db` | PostgreSQL connection string |
| `HOST` | `127.0.0.1` | API server binding host |
| `PORT` | `8000` | API server port |
| `ENVIRONMENT` | `development` | Runtime environment (`development`, `production`, `test`) |

*Note: If `DATABASE_URL` is omitted or PostgreSQL is unreachable, all backend endpoints automatically operate in resilient in-memory fallback mode.*

### Frontend (`.env` or `.env.local`)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `http://localhost:8000` | Backend API base URL for client requests |

---

## 8. Database Setup, Migrations & Ingestion

### Start PostGIS Container
```powershell
docker-compose up -d
```
Verify the container is healthy:
```powershell
docker ps --filter "name=railair-postgis"
```

### Run SQL Migrations
Executes all SQL migrations (`001_initial_schema.sql` through `007_cpcb_ground_observations.sql`):
```powershell
.\.venv\Scripts\python -m app.db.migrate
```

### Ingest Data
1. **Historical Monthly Gridded Data (NetCDF)**:
   ```powershell
   .\.venv\Scripts\python -m app.db.ingest_historical
   ```
2. **CPCB CAAQMS Ground Sensor Snapshot**:
   ```powershell
   .\.venv\Scripts\python -m app.db.ingest_cpcb
   ```

---

## 9. Backend Startup & API Documentation

### Start Development Server
From the repository root:
```powershell
$env:PYTHONPATH="backend"
.\.venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive OpenAPI documentation will be available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Verified API Endpoints

#### Core Spatial & Corridor Endpoints
- `GET /health`: Healthcheck, database connection state, and dataset status.
- `GET /api/v1/environmental/grid?pollutant=PM2.5&period=2022-12&corridor_only=true`: Gridded spatial observations filtered by corridor buffer.
- `GET /api/v1/environmental/timeseries?pollutant=PM2.5&grid_id=cell_28_77`: Historical monthly time series for a grid cell or corridor mean.
- `GET /api/v1/environmental/hotspots?pollutant=PM2.5&threshold=120.0`: Spatial anomaly hotspot detection.
- `GET /api/v1/environmental/ground-stations?corridor_only=true`: CPCB ground-sensor observations and metadata.

#### Environmental AI Engine Endpoints
- `GET /api/v1/environmental/ai/analysis?dataset_type=gridded_historical&pollutant=PM2.5`
  - Returns descriptive statistics, 4-season breakdown, 12-month historical climatology, and z-score anomalies.
- `GET /api/v1/environmental/ai/forecast?pollutant=PM2.5&horizon_months=6`
  - Returns 1-to-12 month statistical forecasts, held-out model evaluation metrics (MAE, RMSE), and prediction intervals.
- `GET /api/v1/environmental/ai/advisory?pollutant=PM2.5&averaging_period=24_hour_mean`
  - Returns deterministic CPCB NAAQS 2009 health risk classification, public guidance, and temporal compatibility safeguards.

---

## 10. Frontend Startup & Production Build

### Start Development Server
```powershell
npm run dev
```
The application will launch at `http://localhost:5173/`.

### Run ESLint
```powershell
npm run lint
```

### Production Build
```powershell
npm run build
```
Generates optimized static assets in `dist/`.

---

## 11. Environmental Analysis Engine

The Environmental Analysis Engine calculates deterministic statistics without arbitrary parameter fitting:

1. **Non-Parametric & Parametric Statistics**:
   - Sample Mean: $\bar{x} = \frac{1}{N}\sum_{i=1}^N x_i$
   - Sample Standard Deviation: $s = \sqrt{\frac{1}{N-1}\sum_{i=1}^N (x_i - \bar{x})^2}$
   - Median & Quartiles: Calculated via nearest-rank interpolation. Interquartile Range (IQR) = $Q_3 - Q_1$.
   - **Strict Null Preservation**: Sensor dropouts and missing readings are preserved as `null`. They are excluded from denominators to avoid biasing means toward zero.

2. **Meteorological Season Categorization (India)**:
   - **Winter**: December, January, February
   - **Pre-Monsoon (Summer)**: March, April, May
   - **Monsoon**: June, July, August, September
   - **Post-Monsoon**: October, November

3. **Climatological Anomaly Detection**:
   - Multi-year baseline mean $\mu_m$ and standard deviation $\sigma_m$ are computed for each calendar month $m \in [1, 12]$.
   - Standardized Anomaly: $Z_t = \frac{x_t - \mu_m}{\sigma_m}$.
   - Deviations are flagged as climatological anomalies for research without conflating statistical anomalies with statutory air-quality emergencies.

---

## 12. Forecasting Methodology & Evaluation

To prevent data leakage and ensure realistic validation, the forecasting engine implements an out-of-sample chronological evaluation protocol:

1. **Chronological Train/Test Partition**:
   - **Training Set**: 2017-01 through 2021-12 (60 consecutive months).
   - **Held-Out Test Set**: 2022-01 through 2022-12 (12 consecutive months).
   - Random k-fold cross-validation is strictly avoided because temporal autocorrelation in time series causes severe optimistic bias.

2. **Evaluated Models**:
   - **Seasonal Persistence**: Forecasts each future month as the observed concentration from the exact same month of the previous year: $\hat{y}_{t+h} = y_{t+h-12}$.
   - **12-Month Historical Climatology**: Forecasts each future month as the multi-year training mean for that calendar month: $\hat{y}_{t+h} = \bar{y}_{m}$.

3. **Held-Out Accuracy Metrics**:
   - **Mean Absolute Error (MAE)**: $\text{MAE} = \frac{1}{n}\sum_{i=1}^n |y_i - \hat{y}_i|$
   - **Root Mean Squared Error (RMSE)**: $\text{RMSE} = \sqrt{\frac{1}{n}\sum_{i=1}^n (y_i - \hat{y}_i)^2}$
   - Model selection selects the minimum RMSE model on the held-out test year.

4. **Prediction Uncertainty Intervals**:
   - Bounds are computed as $\hat{y} \pm 1.96 \cdot s_e \cdot \sqrt{h/12}$, where $s_e$ is the out-of-sample standard error and $h$ is the forecast step ahead.
   - Physical constraints are enforced: lower bounds are clipped at $0.0\ \mu\text{g/m}^3$ (pollutant concentrations cannot be negative).

---

## 13. Public Advisory Methodology & Averaging-Period Safeguards

### Regulatory Foundation
Advisories are evaluated deterministically against the **CPCB National Ambient Air Quality Standards (NAAQS 2009)** and National Air Quality Index (AQI) breakpoints:

| Pollutant | CPCB 24-Hour Standard | CPCB Annual Standard | CPCB 1-Hour Standard | Unit |
| :--- | :--- | :--- | :--- | :--- |
| **PM2.5** | 60 | 40 | *None* | $\mu\text{g/m}^3$ |
| **PM10** | 100 | 60 | *None* | $\mu\text{g/m}^3$ |
| **NO2** | 80 | 40 | *None* | $\mu\text{g/m}^3$ |
| **SO2** | 80 | 50 | *None* | $\mu\text{g/m}^3$ |
| **CO** | *None* | *None* | 4.0 | $\text{mg/m}^3$ |
| **Ozone** | *None* | *None* | 180 | $\mu\text{g/m}^3$ |
| **NH3** | 400 | 100 | *None* | $\mu\text{g/m}^3$ |

### The Averaging-Period Safety Bug & Resolution

#### Observed Bug
In previous versions, toggling between **24-Hour Standard**, **Monthly Mean**, and **1-Hr Snapshot** displayed the exact same concentration (`105 µg/m³`), identical category (`POOR (RISK: HIGH)`), and a hardcoded `Confidence: HIGH` badge. This gave users the misleading impression that a single instantaneous reading or a 30-day gridded average was a verified 24-hour statutory exceedance.

#### End-to-End Architectural Fix
1. **Dynamic Data Sourcing**:
   - `24_hour_mean`: Queries the statutory ground sensor snapshot (`cpcb_snapshot_2026`). Because it is an instantaneous reading, it is flagged as `is_instantaneous_snapshot=True`.
   - `monthly_mean`: Dynamically switches source to the gridded atmospheric model (`zeonodo-data2`), retrieving the monthly average (`195.0 µg/m³`, dated `2022-12-01T00:00:00Z`).
   - `1_hour_snapshot`: Retrieves the instantaneous ground observation (`104.6 µg/m³`, timestamped `2026-10-24T21:30:00Z`).
2. **Strict Averaging-Period Compatibility**:
   - **24-Hour Standard**: Under CPCB criteria, statutory 24-hour compliance requires continuous diurnal sampling (minimum 16 hours of valid data). A point-in-time snapshot cannot confirm a 24-hour exceedance. The engine returns `exceedance_status="unverified_averaging_period"`, category `"Unverified Period (Snapshot Data)"`, and risk `"insufficient_data"`.
   - **Monthly Mean**: Because CPCB NAAQS 2009 defines no statutory monthly standard, monthly estimates return `category="Modelled Monthly Mean"` and `exceedance_status="unverified_averaging_period"`, preventing false statutory non-compliance declarations.
   - **1-Hour Snapshot**: CPCB NAAQS 2009 defines 1-hour thresholds *only* for CO ($4.0\ \text{mg/m}^3$) and Ozone ($180\ \mu\text{g/m}^3$). For PM2.5, PM10, and NO2, the engine explicitly returns `exceedance_status="unverified_averaging_period"` and `risk_level="insufficient_data"`.
3. **Deterministic Confidence Representation**:
   - Exact rule-based threshold evaluations do not have statistical confidence intervals. The hardcoded `Confidence: HIGH` badge was eliminated. The system reports `confidence_level="not_estimated"` across all deterministic advisory evaluations.
4. **UI Safety Notice**:
   - An explanatory warning banner renders when an unverified period is active, explaining the sampling requirements to users.

---

## 14. Data Sources, Provenance & Limitations

### 1. Gridded Historical Dataset (`zeonodo-data2`)
- **Coverage**: 72 consecutive months from January 2017 to December 2022.
- **Resolution**: 0.1° $\times$ 0.1° spatial grid covering the Northern India / Gangetic Plain rail corridor.
- **Provenance**: IIT Delhi atmospheric aerosol NetCDF series derived from satellite Aerosol Optical Depth (AOD) and chemical transport modeling.
- **Classification**: `modelled` gridded data.

### 2. CPCB Ground Monitoring Snapshot (`cpcb_snapshot_2026`)
- **Coverage**: 25 Continuous Ambient Air Quality Monitoring Stations (CAAQMS) intersecting the rail corridor.
- **Timestamp**: Single point-in-time statutory snapshot from **2026-10-24 21:30:00 UTC**.
- **Classification**: `measured` ground telemetry.
- **Limitation**: The imported CPCB dataset is a fixed timestamped snapshot, not a continuous live streaming feed. It cannot be used for time-series forecasting.

### 3. Non-Clinical Disclaimer
Environmental advisories generated by RailAir Intelligence provide population-level protective guidance and environmental situational awareness. They do not constitute individualized clinical diagnoses or medical prescriptions. Individuals with pre-existing cardiovascular or respiratory conditions should consult qualified healthcare practitioners.

---

## 15. Test Commands & Validation Workflow

The platform maintains an automated test suite across both frontend and backend stacks:

### Backend Tests (Pytest)
```powershell
.\.venv\Scripts\pytest backend
```
*Expected: 120 passed in ~6 seconds.*

### Frontend Tests (Vitest)
```powershell
npm test -- --run
```
*Expected: 109 passed across 10 test files.*

### Static Analysis (ESLint)
```powershell
npm run lint
```
*Expected: 0 errors, 0 warnings.*

### Production Build Verification
```powershell
npm run build
```
*Expected: Clean production build with Vite.*

### Git Whitespace & Formatting Check
```powershell
git diff --check
```
*Expected: Zero whitespace or newline errors.*

---

## 16. Git Branch Workflow

- **`main`**: Target branch for production-ready, verified submissions.
- **`feat/environmental-ai`**: Environmental AI engine, statistical forecasting, CPCB advisory engine, and averaging-period safety fixes.
- **`feat/backend-mvp`**: PostGIS foundation, SQL migrations, station reconciliation, and spatial corridor endpoints.

---

## 17. Known Limitations & Future Work

1. **Continuous Telemetry Pipeline**: The current ground dataset is an imported snapshot from October 2026. Future iterations will integrate a Celery/Redis scheduled worker to ingest hourly live telemetry feeds from the CPCB Open Data portal.
2. **Micro-Scale Dispersion Modeling**: The gridded dataset operates at 0.1° (~10 km) resolution. Future enhancements can incorporate local Gaussian line-source dispersion models for near-track locomotive emission plumes.
3. **Mobile In-Cabin Telemetry**: Train exposure factors currently rely on empirical literature infiltration ratios (0.35 for AC coaches, 0.85 for Non-AC coaches). Future work will integrate on-train IoT sensor pods for empirical validation.
