# RailAir Intelligence — DataMeet Geospatial Dataset Audit & Initial Data Strategy

## Executive Summary

A comprehensive, non-destructive geospatial dataset audit of the isolated DataMeet resources in `backend-resources/datameet-maps/isolated_data/` was conducted. All original files were treated strictly as read-only. The audit verified file integrity, coordinate reference systems, station records, administrative zonal structures, and reconciliation against RailAir's 7 canonical stations along the **Meerut–Ghaziabad–New Delhi** corridor.

The investigation confirmed that the isolated directory contains **13 files** covering high-level Indian Railway zones, an isolated 70-station subset of Uttar Pradesh railway stations, electoral results, demographic indicators, and documentation. Crucially, the directory contains **no railway track geometry (LineString)**, and its station coverage is restricted to **Uttar Pradesh only**, excluding the National Capital Territory (NCT) of Delhi.

---

## 1. File Inventory & Integrity

The directory `backend-resources/datameet-maps/isolated_data/` contains exactly 13 files. All 13 files are tracked in Git, parse cleanly without syntax errors, and exhibit no truncation or corruption.

| Filename | Format | Size | Lines | Status | Classification & Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `india_census.csv` | CSV | 30 B | 2 | Verified | **Derived Demographic Snippet**: 1 data row comparing national sex ratio (2001: 933, 2011: 940). No district/spatial data. |
| `INDIA_DATA.md` | Markdown | 7,134 B | 105 | Verified | **Documentation**: National overview, demographic profile, Lok Sabha seat counts, and 18 railway zones. |
| `india_isolated_dataset.json` | JSON | 1,570 B | 47 | Verified | **Provenance Metadata**: Index of national boundary paths, census files, and Lok Sabha sources in upstream repo. |
| `india_railway_zones_and_divisions.csv` | CSV | 2,611 B | 19 | Verified | **Tabular Zonal Reference**: 18 railway zones, headquarters, founding years, comma-separated divisions, and route km. |
| `india_railways_profile.json` | JSON | 1,421 B | 31 | Verified | **Infrastructure Metadata**: National route length (68,043 km), electrification stats, and links to upstream DataMeet repos. |
| `RAILWAYS_AND_MAPS.md` | Markdown | 8,163 B | 107 | Verified | **Integration Guide**: GIS layering instructions for QGIS/Mapshaper combining administrative polygons with railway points. |
| `uttar_pradesh_census.csv` | CSV | 38 B | 2 | Verified | **Derived Demographic Snippet**: 1 data row comparing UP state sex ratio (2001: 898, 2011: 908). |
| `UTTAR_PRADESH_DATA.md` | Markdown | 11,915 B | 157 | Verified | **Documentation**: UP state overview, 75 districts, 80 Lok Sabha constituencies, and railway junction catalog. |
| `uttar_pradesh_isolated_dataset.json` | JSON | 2,289 B | 74 | Verified | **Provenance Metadata**: Index of UP boundary layers, district GeoJSONs, and election files in parent directory. |
| `uttar_pradesh_parliamentary_constituencies_2014.csv` | CSV | 7,133 B | 81 | Verified | **Electoral Results**: 80 Lok Sabha seats in UP from 2014 election (winner, margin, runner-up). Tabular only; no geometries. |
| `uttar_pradesh_railway_stations.csv` | CSV | 5,755 B | 71 | Verified | **Tabular Station Catalog**: 70 selected major stations in UP with codes, names, zones, divisions, districts, coordinates, and NSG grade. |
| `uttar_pradesh_railway_stations.geojson` | GeoJSON | 11,203 B | 53 | Verified | **Geospatial Vector Layer**: 46 Point features with properties and coordinates in CRS84 (WGS84). |
| `uttar_pradesh_railways_profile.json` | JSON | 3,064 B | 53 | Verified | **Infrastructure Metadata**: UP railway statistics (9,164 route km), zonal headquarters (NCR, NER), and major junction summaries. |

---

## 2. Railway Station Datasets Audit

### 2.1 Schema & Structure
Two files represent railway stations in Uttar Pradesh:
1. `uttar_pradesh_railway_stations.csv` (70 records):
   - **Columns**: `code` (string), `name` (string), `zone` (string), `division` (string), `district` (string), `latitude` (float), `longitude` (float), `category` (string, e.g. `NSG-2 Non-Suburban Grade`).
2. `uttar_pradesh_railway_stations.geojson` (46 features):
   - **FeatureCollection** with explicit CRS: `urn:ogc:def:crs:OGC:1.3:CRS84` (equivalent to EPSG:4326, longitude first, latitude second).
   - Properties: `code`, `name`, `zone`, `division`, `district`, `category` (short code, e.g. `NSG-2`).

### 2.2 Critical Finding: CSV vs. GeoJSON Discrepancy
- The CSV contains **70 stations**, while the GeoJSON contains only **46 features**.
- Exactly **24 stations** are present in the CSV but omitted from the GeoJSON:
  `BC` (Bareilly City), `IZN` (Izzatnagar), `MUT` (Meerut Cantt), `AYC` (Ayodhya Cantt), `FD` (Faizabad Jn), `GCT` (Ghazipur City), `AME` (Amethi), `LMP` (Lakhimpur), `MNQ` (Mainpuri), `FZD` (Firozabad), `SKB` (Shikohabad Jn), `HRS` (Hathras Jn), `KJN` (Kannauj), `CH` (Chandausi Jn), `MBKD` (Maa Barahi Devi Dham), `MBDD` (Maa Bela Devi Dham Pratapgarh), `BTU` (Baraut), `BLP` (Balrampur), `BRK` (Bahraich), `SVPR` (Shivpur), `ARJ` (Aunrihar Jn), `BHTN` (Bhatni Jn), `AMRO` (Amroha), `HJM` (Heerapur).
- For all 46 shared stations, coordinates match between CSV and GeoJSON with **0.00 m discrepancy**.
- **Conclusion**: The GeoJSON is an incomplete export of the master CSV catalog. The CSV is the more complete dataset in this directory.

### 2.3 Coordinate Validity & Geographic Bounds
- **Coordinate reference system**: WGS84 (EPSG:4326).
- **Coordinate Order**:
  - CSV: `latitude`, `longitude`
  - GeoJSON: `[longitude, latitude]` (RFC 7946 compliant)
- **Bounding Box**:
  - CSV Latitude Range: **24.2189° N** (Renukoot) to **29.9641° N** (Saharanpur Junction)
  - CSV Longitude Range: **77.2730° E** (Baraut) to **84.1503° E** (Ballia)
  - GeoJSON Latitude Range: **24.2189° N** to **29.9641° N**
  - GeoJSON Longitude Range: **77.4326° E** (Ghaziabad Junction) to **84.1503° E** (Ballia)
  *(Notice GeoJSON's westernmost station is Ghaziabad because Baraut at 77.2730° E is among the 24 omitted records).*
- **Missing or Invalid Coordinates**: **Zero**. Every record has non-null, valid numeric floats within valid UP boundaries.
- **Station Types Included**: Passenger stations categorized under Indian Railways Non-Suburban Grades: NSG-2 (13 stations), NSG-3 (38 stations), NSG-4 (16 stations), NSG-5 (3 stations). Small rural halts (HG grades) and suburban stations (SG grades) were excluded from this curated extract.

---

## 3. Railway Zones, Divisions & Other Geography

### 3.1 Railway Zones and Divisions (`india_railway_zones_and_divisions.csv`)
- **Total Records**: 18 rows representing all 18 Indian Railway administrative zones (CR, ECoR, ECR, ER, NCR, NER, NFR, NR, NWR, SCR, SECR, SER, SWR, SR, WCR, WR, MR, SCoR).
- **Structure**:
  - `zone_code`: Primary alphanumeric code (e.g., `NR`, `NCR`).
  - `zone_name`: Full zone name.
  - `headquarters`: City where zonal HQ sits.
  - `established_year`: Integer year of constitution.
  - `divisions`: Unstructured comma-separated string of division names (e.g., `"Delhi, Ambala, Firozpur, Lucknow, Moradabad"`).
  - `route_km_approx`: Approximate route length.
  - `states_covered`: Comma-separated string of states.
- **Limitations**:
  - Contains **no spatial geometry** (no polygons representing zonal or divisional jurisdictions).
  - Divisions are listed as un-normalized strings rather than distinct records with codes (e.g., `DLI` for Delhi division).
  - Cannot be joined directly via relational foreign key to stations without string splitting and normalization.

### 3.2 Non-Railway Geography Datasets
1. **Census Snippets (`india_census.csv`, `uttar_pradesh_census.csv`)**:
   - Only 1 row per file showing sex ratio changes (2001 vs 2011).
   - **Recommendation**: Do not ingest into RailAir database. They provide no spatial, demographic, or commute value.
2. **Electoral Data (`uttar_pradesh_parliamentary_constituencies_2014.csv`)**:
   - 80 Lok Sabha seat election results from 2014.
   - Tabular only (no polygon boundary geometry in `isolated_data`).
   - **Recommendation**: Do not ingest for Phase 1. Irrelevant to corridor railway passenger exposure.
3. **Markdown Profiles & Metadata JSONs**:
   - Serve as high-value documentation and citation sources for upstream DataMeet URLs.

---

## 4. Reconciliation with RailAir's 7 Canonical Stations

The initial RailAir corridor is **Meerut – Ghaziabad – New Delhi**. The application defines 7 canonical stations: `MRT`, `MMU`, `MNR`, `GZB`, `SAH`, `DSO`, `NDLS`.

Each station was audited against the DataMeet records using exact code matching, normalized name matching, and Haversine distance calculations:

| Existing RailAir ID | RailAir Station Name | RailAir Coordinates (Lat, Lng) | Best DataMeet Candidate | Candidate Coords (Lat, Lng) | Distance Delta | Match Confidence | Conflicting or Missing Information | Recommended Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MRT** | Meerut City Junction | 28.9845, 77.7064 | **MTC** (Meerut City) | 28.9744, 77.6885 | **2.07 km** | **HIGH** | Official IR station code is `MTC`, not synthetic `MRT`. Category is NSG-3. | Preserve stable internal ID `MRT`. Map alias `ir_code: 'MTC'`. Align coordinates to surveyed point (28.9744, 77.6885) during Phase 2 PostGIS migration. |
| **MMU** | Modinagar | 28.8324, 77.5803 | *None* | N/A | N/A | **NONE** | Modinagar (official IR code `MDNR`) is absent from the 70 major UP stations list. Closest candidate is GZB at 24.3 km. | Retain existing synthetic seed coordinates and ID. Supplement from national `datameet/railways/stations.json` when adding smaller roadside stations. |
| **MNR** | Muradnagar | 28.7762, 77.5096 | *None* | N/A | N/A | **NONE** | Muradnagar (official IR code `MUD`) is absent from the 70 major UP stations list. Closest candidate is GZB at 14.4 km. | Retain existing synthetic seed coordinates and ID. Supplement from national DataMeet stations dataset in Phase 2. |
| **GZB** | Ghaziabad Junction | 28.6595, 77.4246 | **GZB** (Ghaziabad Junction) | 28.6657, 77.4326 | **1.04 km** | **HIGH** | Exact station code match (`GZB`). Coordinate difference of 1.04 km between synthetic seed and DataMeet surveyed point. Category is NSG-3. | Retain canonical ID `GZB`. Accept DataMeet surveyed coordinates (28.6657, 77.4326) during future database migration. |
| **SAH** | Sahibabad Junction | 28.6838, 77.3613 | *None* | N/A | N/A | **NONE** | Sahibabad (official IR code `SBB`) is absent from the 70 major UP stations list (suburban classification). Closest candidate is GZB at 7.2 km. | Retain existing synthetic station definition. Map `ir_code: 'SBB'` when ingesting national rail network. |
| **DSO** | Delhi Shahdara Junction | 28.6730, 77.2979 | *None* | N/A | N/A | **NONE** | Delhi Shahdara (official IR code `DSA`) is in **NCT of Delhi**, which is outside Uttar Pradesh state boundaries. Closest UP candidate is GZB at 13.2 km. | Retain existing synthetic station definition. Supplement with Delhi NCT railway station dataset in Phase 2. |
| **NDLS** | New Delhi Railway Station | 28.6419, 77.2194 | *None* | N/A | N/A | **NONE** | New Delhi (official IR code `NDLS`) is located in **NCT of Delhi**, outside the UP boundary. Closest UP station is GZB at 21.0 km. | Retain canonical ID `NDLS`. Use official IR coordinates for NDLS (28.6419, 77.2194) from national dataset. |

### Key Reconciliation Insights
1. **Coverage Boundary**: The isolated dataset only covers Uttar Pradesh (`uttar_pradesh_railway_stations`). Because RailAir's flagship corridor crosses state lines into the **NCT of Delhi** (`DSO`, `NDLS`), a UP-only dataset cannot fully cover the corridor.
2. **Station Hierarchy Filter**: The UP dataset includes only 70 major intercity stations (NSG-2 through NSG-5). Intervening roadside stations (`MMU`, `MNR`, `SAH`) are omitted from this high-level extract.
3. **Station Code Standardization**:
   - RailAir synthetic ID: `MRT` ➔ Official Indian Railways Code: `MTC`
   - RailAir synthetic ID: `MMU` ➔ Official Indian Railways Code: `MDNR`
   - RailAir synthetic ID: `MNR` ➔ Official Indian Railways Code: `MUD`
   - RailAir synthetic ID: `SAH` ➔ Official Indian Railways Code: `SBB`
   - RailAir synthetic ID: `DSO` ➔ Official Indian Railways Code: `DSA`
   - RailAir synthetic ID: `NDLS` ➔ Official Indian Railways Code: `NDLS` (Exact match)
   - RailAir synthetic ID: `GZB` ➔ Official Indian Railways Code: `GZB` (Exact match)

---

## 5. Corridor Geometry Assessment

### 5.1 Geometry Types Found
- The isolated DataMeet files contain **zero LineString or MultiLineString track vectors**.
- `uttar_pradesh_railway_stations.geojson` contains exclusively `Point` features.

### 5.2 Distinction Between Geometry Types
1. **Straight line connecting stations**: A mathematical chord ignoring physical rail curves and track gradients.
2. **Schematic corridor polyline**: The current implementation in `src/data/mock/corridorSegments.ts` (3-point illustrative segments). As explicitly stated in `src/data/mock/corridorSegments.ts` (line 9):
   > *"Corridor geometry is illustrative only and does not represent verified railway track geometry."*
3. **Verified railway alignment**: Authoritative centerline vector geometry representing actual physical tracks, switches, and bridges.
4. **Authoritative spatial dataset**: The upstream DataMeet railways repository (`datameet/railways/trains.json`) or OpenStreetMap (`railway=rail` tag in OSM overpass/geofabrik).

### 5.3 Recommendation for Track Alignment
To replace the schematic polylines with verified railway track geometry, RailAir should:
- Ingest `trains.json` from `https://github.com/datameet/railways` or extract the Northern Railway Delhi–Meerut mainline track vector from OpenStreetMap Overpass API (`way["railway"="rail"]["usage"="main"]`).
- Retain the current schematic polylines in the frontend map without modification for now.

---

## 6. PostgreSQL/PostGIS Readiness & Proposed Data Model

### 6.1 Review of Existing Migration (`backend/app/db/migrations/001_initial_schema.sql`)
The initial schema defines:
- `provenance_records` (source, data_kind, confidence, confidence_score, notes)
- `stations` (id, name, short_name, station_type, distance_from_origin_km, platforms, division, latitude, longitude, PostGIS `geom` Point 4326)
- `pollutant_observations` (id, station_id, pollutant, value, unit, who_guideline, naaqs_standard, observed_at, provenance_id)
- `corridors` (id, name, focus, total_distance_km, total_nodes)
- `corridor_segments` (id, corridor_id, from_station_id, to_station_id, sequence_order, distance_km, travel_time_minutes, PostGIS `geom` LineString 4326)

### 6.2 Schema Gaps Identified
1. **Station Codes vs Internal IDs**: `stations.id` is currently `VARCHAR(10) PRIMARY KEY`. RailAir requires stable internal IDs (`MRT`, `MMU`, etc.) for frontend contract safety. To store official Indian Railways codes (`MTC`, `MDNR`), the table needs an `ir_code VARCHAR(10) UNIQUE` column.
2. **Station Categorization**: Existing schema enforces `CHECK (station_type IN ('major', 'halt', 'junction', 'terminal'))`. DataMeet provides Indian Railways standard Non-Suburban Grades (`NSG-2`, `NSG-3`, etc.). The schema needs `ir_category VARCHAR(50)`.
3. **Administrative Hierarchy**: Existing schema stores `division VARCHAR(100)` as a free-text string with default `'Delhi Division · Northern Railway'`. It lacks explicit `zone_code VARCHAR(10)` and `district VARCHAR(100)`.
4. **Normalized Zonal Table**: There is currently no `railway_zones` or `railway_divisions` table in PostgreSQL.
5. **Provenance Classification**: `provenance_records.data_kind` has `CHECK (data_kind IN ('simulated', 'measured', 'modelled'))`. Importing geospatial reference datasets requires adding `'geospatial_open_data'` or classifying DataMeet as `'measured'`/`'open_data'`.

### 6.3 Minimal Normalized PostGIS Data Model (for Phase 2 Migration)

```sql
-- 1. Railway Zones Reference Table
CREATE TABLE IF NOT EXISTS railway_zones (
    zone_code VARCHAR(10) PRIMARY KEY,                   -- e.g. 'NR', 'NCR'
    zone_name VARCHAR(100) NOT NULL,
    headquarters VARCHAR(100) NOT NULL,
    established_year INT,
    route_km_approx INT,
    states_covered TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Extended Stations Table
CREATE TABLE IF NOT EXISTS stations (
    id VARCHAR(10) PRIMARY KEY,                         -- RailAir canonical ID ('MRT', 'GZB', 'NDLS')
    ir_code VARCHAR(10) UNIQUE,                         -- Official Indian Railways code ('MTC', 'GZB', 'NDLS')
    name VARCHAR(100) NOT NULL,
    short_name VARCHAR(50) NOT NULL,
    station_type VARCHAR(20) NOT NULL CHECK (station_type IN ('major', 'halt', 'junction', 'terminal')),
    ir_category VARCHAR(50),                            -- 'NSG-2 Non-Suburban Grade', 'NSG-3', etc.
    zone_code VARCHAR(10) REFERENCES railway_zones(zone_code),
    division VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(50) NOT NULL DEFAULT 'Uttar Pradesh',
    latitude NUMERIC(9, 6) NOT NULL CHECK (latitude BETWEEN -90.0 AND 90.0),
    longitude NUMERIC(9, 6) NOT NULL CHECK (longitude BETWEEN -180.0 AND 180.0),
    geom GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    provenance_id INT REFERENCES provenance_records(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stations_geom ON stations USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_stations_zone ON stations(zone_code);
CREATE INDEX IF NOT EXISTS idx_stations_ir_code ON stations(ir_code);
```

---

## 7. Data Quality, Licensing & Reproducibility Strategy

### 7.1 Licensing and Provenance
- **Upstream Origin**: Data originated from DataMeet community repositories:
  - `datameet/maps`: Open Data Commons Open Database License (ODbL) / Creative Commons Attribution-ShareAlike (CC-BY-SA 2.5/4.0).
  - `datameet/railways`: Derived from Indian Railways published timetable data and open GIS records under ODbL.
- **Local Extraction**: Files in `isolated_data` were generated via a local PowerShell batch extraction (`extract_isolated_data.ps1`) referencing an upstream workspace (`c:/Users/Astha/github/test1/maps/`).
- **Attribution Requirement**: Any public or production deployment utilizing DataMeet station coordinates must display attribution:
  > *"Railway station and zonal metadata courtesy of DataMeet (datameet.org) under ODbL / CC-BY-SA."*

### 7.2 Proposed Validation & Ingestion Workflow (for Future Phase)
```
[Raw DataMeet Sources]
        │
        ▼
[Read-Only Schema Validator] ── (audit_datameet.py)
        │
        ├─► Validates coordinate ranges (WGS84 EPSG:4326)
        ├─► Checks duplicate codes and geometry types
        ├─► Verifies non-null primary keys
        │
        ▼
[Staging Table (raw_datameet_stations)] ── Unaltered raw ingest
        │
        ▼
[Reconciliation & Transformation Layer]
        ├─► Maps official IR code to RailAir stable ID
        ├─► Assigns data_kind = 'geospatial_open_data'
        ├─► Enforces idempotent UPSERT (ON CONFLICT (id) DO UPDATE)
        │
        ▼
[Production PostGIS Tables (stations, railway_zones)]
```

---

## 8. Environmental Data Boundary Reminder

The DataMeet resources analyzed in this audit are purely **geographic and administrative infrastructure datasets**.
- **No pollution measurements** exist within DataMeet datasets.
- **No environmental sensor readings** were ingested, inferred, or fabricated.
- Simulated PM2.5, PM10, NO2, and CO baseline observations in `src/data/mock/stations.ts` and `backend/app/db/seed_data.py` remain strictly preserved and explicitly labeled as simulated (`data_kind: 'simulated'`).

---

## 9. Deliverables & Verification Log

### 9.1 Files Created
1. `backend-resources/audit_datameet.py`: Standalone, read-only Python audit and reconciliation script (idempotent, standard library only).
2. `backend/tests/test_datameet_audit.py`: 8 automated unit tests verifying inventory, coordinate validity, GeoJSON parsing, reconciliation matching, and corridor geometry checks.
3. `backend-resources/DATAMEET_DATASET_AUDIT.md`: Formal audit report (this document).

### 9.2 Verification Commands Executed
1. `git branch -vv`: Confirmed branch `feat/backend-mvp` tracking `origin/feat/backend-mvp`.
2. `git status --short`: Confirmed working tree status; original source files completely untouched.
3. `.venv\Scripts\python.exe backend-resources/audit_datameet.py`: Executed twice; confirmed 100% idempotent output without errors or file modifications.
4. `.venv\Scripts\pytest.exe backend/tests/`: **19 passed** in 0.11s (including 8 new audit tests and 11 existing backend foundation tests).
5. `npm test`: **39 passed** in 4 test suites.
6. `npm run lint`: **0 warnings, 0 errors**.
