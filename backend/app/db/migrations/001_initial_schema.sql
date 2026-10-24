-- ==============================================================================
-- RailAir Intelligence — PostgreSQL + PostGIS Initial Database Migration (v0.1)
-- ==============================================================================

-- 1. Enable Spatial Extensions
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Provenance Records Table
-- Strictly tracks the nature of data (simulated vs measured vs modelled)
CREATE TABLE IF NOT EXISTS provenance_records (
    id SERIAL PRIMARY KEY,
    source VARCHAR(150) NOT NULL,
    data_kind VARCHAR(20) NOT NULL CHECK (data_kind IN ('simulated', 'measured', 'modelled')),
    confidence VARCHAR(20) NOT NULL CHECK (confidence IN ('high', 'medium', 'low', 'very-low')),
    confidence_score NUMERIC(4, 3) NOT NULL CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    notes TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Stations Table
-- Core station metadata with PostGIS Point geometry (EPSG:4326)
CREATE TABLE IF NOT EXISTS stations (
    id VARCHAR(10) PRIMARY KEY,                         -- Standard Railway Station Code (e.g. 'NDLS', 'MRT')
    name VARCHAR(100) NOT NULL,
    short_name VARCHAR(50) NOT NULL,
    station_type VARCHAR(20) NOT NULL CHECK (station_type IN ('major', 'halt', 'junction', 'terminal')),
    distance_from_origin_km NUMERIC(6, 2) NOT NULL CHECK (distance_from_origin_km >= 0.0),
    platforms VARCHAR(50),
    division VARCHAR(100) NOT NULL DEFAULT 'Delhi Division · Northern Railway',
    latitude NUMERIC(9, 6) NOT NULL CHECK (latitude BETWEEN -90.0 AND 90.0),
    longitude NUMERIC(9, 6) NOT NULL CHECK (longitude BETWEEN -180.0 AND 180.0),
    geom GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    provenance_id INT REFERENCES provenance_records(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial index on station geometries
CREATE INDEX IF NOT EXISTS idx_stations_geom ON stations USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_stations_type ON stations(station_type);

-- 4. Pollutant Observations Table
-- Explicitly tagged with unit, pollutant type, standards, and synthetic provenance
CREATE TABLE IF NOT EXISTS pollutant_observations (
    id VARCHAR(50) PRIMARY KEY,                         -- e.g. 'obs-MRT-pm25'
    station_id VARCHAR(10) NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    pollutant VARCHAR(10) NOT NULL CHECK (pollutant IN ('PM2.5', 'PM10', 'NO2', 'CO')),
    value NUMERIC(8, 2) NOT NULL CHECK (value >= 0.0),
    unit VARCHAR(20) NOT NULL DEFAULT 'µg/m³',
    who_guideline NUMERIC(8, 2),
    naaqs_standard NUMERIC(8, 2),
    observed_at TIMESTAMPTZ NOT NULL DEFAULT '2024-10-24T07:00:00Z',
    provenance_id INT REFERENCES provenance_records(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obs_station ON pollutant_observations(station_id);
CREATE INDEX IF NOT EXISTS idx_obs_pollutant ON pollutant_observations(pollutant);
CREATE INDEX IF NOT EXISTS idx_obs_station_pollutant ON pollutant_observations(station_id, pollutant);

-- 5. Corridors Table
CREATE TABLE IF NOT EXISTS corridors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    focus VARCHAR(100) NOT NULL,
    total_distance_km NUMERIC(6, 2) NOT NULL CHECK (total_distance_km >= 0.0),
    total_nodes INT NOT NULL CHECK (total_nodes >= 2),
    provenance_id INT REFERENCES provenance_records(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Corridor Alignment Segments Table
-- Holds ordered track alignment segments with LineString spatial geometry
CREATE TABLE IF NOT EXISTS corridor_segments (
    id VARCHAR(50) PRIMARY KEY,
    corridor_id VARCHAR(50) NOT NULL REFERENCES corridors(id) ON DELETE CASCADE,
    from_station_id VARCHAR(10) NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    to_station_id VARCHAR(10) NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
    sequence_order INT NOT NULL CHECK (sequence_order >= 1),
    distance_km NUMERIC(6, 2) NOT NULL CHECK (distance_km >= 0.0),
    travel_time_minutes INT NOT NULL CHECK (travel_time_minutes >= 0),
    pm25_estimate NUMERIC(8, 2) NOT NULL CHECK (pm25_estimate >= 0.0),
    pm10_estimate NUMERIC(8, 2) NOT NULL CHECK (pm10_estimate >= 0.0),
    geom GEOMETRY(LineString, 4326),
    provenance_id INT REFERENCES provenance_records(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_corridor_seq UNIQUE (corridor_id, sequence_order)
);

CREATE INDEX IF NOT EXISTS idx_corridor_segments_geom ON corridor_segments USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_corridor_segments_corridor ON corridor_segments(corridor_id);

-- ==============================================================================
-- Initial Deterministic Synthetic Seed Data
-- ==============================================================================

-- Base Simulation Provenance Record
INSERT INTO provenance_records (id, source, data_kind, confidence, confidence_score, notes, recorded_at)
VALUES (
    1,
    'RailAir Intelligence Simulation Engine v0.1',
    'simulated',
    'low',
    0.250,
    'All values are illustrative simulations. No real monitoring instruments were used.',
    '2024-10-24 07:00:00+00'
) ON CONFLICT (id) DO NOTHING;

-- Seed Stations
INSERT INTO stations (id, name, short_name, station_type, distance_from_origin_km, platforms, division, latitude, longitude, provenance_id)
VALUES
    ('MRT',  'Meerut City Junction',      'Meerut',    'major',    0.0,  '5 Platforms',  'Delhi Division · Northern Railway',          28.984500, 77.706400, 1),
    ('MMU',  'Modinagar',                 'Modinagar', 'halt',     22.0, '2 Platforms',  'Delhi Division · Northern Railway',          28.832400, 77.580300, 1),
    ('MNR',  'Muradnagar',                'Muradnagar','halt',     38.0, '2 Platforms',  'Delhi Division · Northern Railway',          28.776200, 77.509600, 1),
    ('GZB',  'Ghaziabad Junction',        'Ghaziabad', 'junction', 56.0, '6 Platforms',  'Major Intercity Junction · Northern Railway',28.659500, 77.424600, 1),
    ('SAH',  'Sahibabad Junction',        'Sahibabad', 'junction', 65.0, '4 Platforms',  'Delhi Division · Northern Railway',          28.683800, 77.361300, 1),
    ('DSO',  'Delhi Shahdara Junction',   'Shahdara',  'halt',     72.0, '4 Platforms',  'Delhi Division · Northern Railway',          28.673000, 77.297900, 1),
    ('NDLS', 'New Delhi Railway Station', 'New Delhi', 'terminal', 83.0, '16 Platforms', 'Central Mega Terminal · Northern Railway',   28.641900, 77.219400, 1)
ON CONFLICT (id) DO NOTHING;

-- Seed Observations
INSERT INTO pollutant_observations (id, station_id, pollutant, value, unit, who_guideline, naaqs_standard, provenance_id)
VALUES
    ('obs-MRT-pm25',  'MRT',  'PM2.5', 112.0, 'µg/m³', 15.0, 60.0, 1),
    ('obs-MRT-pm10',  'MRT',  'PM10',  198.0, 'µg/m³', 45.0, 100.0, 1),
    ('obs-MMU-pm25',  'MMU',  'PM2.5', 98.0,  'µg/m³', 15.0, 60.0, 1),
    ('obs-MMU-pm10',  'MMU',  'PM10',  172.0, 'µg/m³', 45.0, 100.0, 1),
    ('obs-MNR-pm25',  'MNR',  'PM2.5', 128.0, 'µg/m³', 15.0, 60.0, 1),
    ('obs-MNR-pm10',  'MNR',  'PM10',  221.0, 'µg/m³', 45.0, 100.0, 1),
    ('obs-GZB-pm25',  'GZB',  'PM2.5', 145.0, 'µg/m³', 15.0, 60.0, 1),
    ('obs-GZB-pm10',  'GZB',  'PM10',  248.0, 'µg/m³', 45.0, 100.0, 1),
    ('obs-SAH-pm25',  'SAH',  'PM2.5', 138.0, 'µg/m³', 15.0, 60.0, 1),
    ('obs-SAH-pm10',  'SAH',  'PM10',  235.0, 'µg/m³', 45.0, 100.0, 1),
    ('obs-DSO-pm25',  'DSO',  'PM2.5', 156.0, 'µg/m³', 15.0, 60.0, 1),
    ('obs-DSO-pm10',  'DSO',  'PM10',  267.0, 'µg/m³', 45.0, 100.0, 1),
    ('obs-NDLS-pm25', 'NDLS', 'PM2.5', 168.0, 'µg/m³', 15.0, 60.0, 1),
    ('obs-NDLS-pm10', 'NDLS', 'PM10',  289.0, 'µg/m³', 45.0, 100.0, 1)
ON CONFLICT (id) DO NOTHING;

-- Seed Corridor
INSERT INTO corridors (id, name, focus, total_distance_km, total_nodes, provenance_id)
VALUES (
    'CORR-MRT-DEL',
    'Meerut—Ghaziabad—Delhi Main Line',
    'Meerut—Ghaziabad—Delhi',
    71.8,
    7,
    1
) ON CONFLICT (id) DO NOTHING;
