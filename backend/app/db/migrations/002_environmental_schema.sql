-- ==============================================================================
-- RailAir Intelligence — PostgreSQL + PostGIS Environmental Schema Migration (v0.2)
-- ==============================================================================
-- Normalized environmental schema supporting in-situ ground CAAQMS observations,
-- gridded satellite/chemical-transport estimates, and meteorological variables.
-- Compatible with PostGIS EPSG:4326.
-- ==============================================================================

-- 1. Environmental Datasets & Provenance Registry
CREATE TABLE IF NOT EXISTS environmental_datasets (
    id VARCHAR(50) PRIMARY KEY,                         -- e.g. 'cpcb_snapshot_2026', 'zenodo_gridded_pm_v2'
    title VARCHAR(200) NOT NULL,
    publisher VARCHAR(150) NOT NULL,
    persistent_id VARCHAR(100),                         -- DOI or OGD UUID
    version VARCHAR(50) NOT NULL DEFAULT '1.0',
    license VARCHAR(100) NOT NULL,                      -- 'GODL-India', 'CC-BY-4.0'
    source_filename VARCHAR(150) NOT NULL,
    source_checksum_sha256 VARCHAR(64) NOT NULL,
    spatial_coverage VARCHAR(100) NOT NULL,             -- 'National - India', 'Meerut-Ghaziabad-Delhi Corridor'
    temporal_coverage VARCHAR(100) NOT NULL,
    measurement_type VARCHAR(50) NOT NULL,              -- 'in_situ_ground', 'gridded_surface_estimate', 'satellite_column'
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Environmental Ground Observations Table
-- Stores regulatory CAAQMS statutory monitoring station telemetry
CREATE TABLE IF NOT EXISTS environmental_ground_observations (
    id VARCHAR(100) PRIMARY KEY,                        -- e.g. 'cpcb_delhi_anand_vihar_pm25_20261025'
    source_station_name VARCHAR(150) NOT NULL,
    source_station_code VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(50) NOT NULL DEFAULT 'India',
    canonical_station_id VARCHAR(10) REFERENCES stations(id) ON DELETE SET NULL,
    pollutant VARCHAR(20) NOT NULL,                     -- 'PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'OZONE', 'NH3'
    value_avg NUMERIC(10, 4),                           -- NULL if sensor calibration / NA
    value_min NUMERIC(10, 4),
    value_max NUMERIC(10, 4),
    unit VARCHAR(20) NOT NULL,                          -- 'µg/m³', 'mg/m³'
    observed_at TIMESTAMPTZ NOT NULL,
    acquisition_at TIMESTAMPTZ NOT NULL,
    temporal_resolution VARCHAR(20) NOT NULL DEFAULT 'hourly_snapshot',
    latitude NUMERIC(9, 6) NOT NULL CHECK (latitude BETWEEN -90.0 AND 90.0),
    longitude NUMERIC(9, 6) NOT NULL CHECK (longitude BETWEEN -180.0 AND 180.0),
    geom GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    dataset_id VARCHAR(50) NOT NULL REFERENCES environmental_datasets(id) ON DELETE RESTRICT,
    quality_status VARCHAR(20) NOT NULL DEFAULT 'valid' CHECK (quality_status IN ('valid', 'missing_na', 'sensor_drift', 'quarantined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ground_obs UNIQUE (source_station_name, pollutant, observed_at)
);

CREATE INDEX IF NOT EXISTS idx_ground_obs_geom ON environmental_ground_observations USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_ground_obs_pollutant_time ON environmental_ground_observations(pollutant, observed_at);
CREATE INDEX IF NOT EXISTS idx_ground_obs_canonical ON environmental_ground_observations(canonical_station_id);
CREATE INDEX IF NOT EXISTS idx_ground_obs_city ON environmental_ground_observations(city);

-- 3. Gridded Environmental Estimates Table
-- Stores regional corridor-sliced NetCDF monthly rasters (2017–2022)
CREATE TABLE IF NOT EXISTS environmental_gridded_estimates (
    id VARCHAR(100) PRIMARY KEY,                        -- e.g. 'pm25_grid_28.67_77.24_2022_12'
    grid_id VARCHAR(50) NOT NULL,                       -- e.g. 'grid_28.67_77.24'
    pollutant VARCHAR(20) NOT NULL,                     -- 'PM2.5', 'PM10'
    value NUMERIC(10, 4),                               -- NULL if NaN / missing
    unit VARCHAR(20) NOT NULL DEFAULT 'µg/m³',
    year INT NOT NULL CHECK (year BETWEEN 2000 AND 2100),
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    observed_at TIMESTAMPTZ NOT NULL,                   -- Normalized to 1st of month: 'YYYY-MM-01T00:00:00Z'
    temporal_resolution VARCHAR(20) NOT NULL DEFAULT 'monthly_mean',
    spatial_resolution VARCHAR(20) NOT NULL DEFAULT '10km',
    latitude NUMERIC(9, 6) NOT NULL CHECK (latitude BETWEEN -90.0 AND 90.0),
    longitude NUMERIC(9, 6) NOT NULL CHECK (longitude BETWEEN -180.0 AND 180.0),
    geom GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    dataset_id VARCHAR(50) NOT NULL REFERENCES environmental_datasets(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_gridded_est UNIQUE (grid_id, pollutant, observed_at)
);

CREATE INDEX IF NOT EXISTS idx_gridded_est_geom ON environmental_gridded_estimates USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_gridded_est_pollutant_time ON environmental_gridded_estimates(pollutant, observed_at);
CREATE INDEX IF NOT EXISTS idx_gridded_est_grid ON environmental_gridded_estimates(grid_id);

-- 4. Meteorological & Atmospheric Gas Reanalysis Table
-- Stores Sentinel-5P TROPOMI column densities & ERA5-Land weather parameters
CREATE TABLE IF NOT EXISTS meteorological_observations (
    id VARCHAR(100) PRIMARY KEY,                        -- e.g. 'met_delhi_temperature_20230101'
    source_station_name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    variable_name VARCHAR(50) NOT NULL,                 -- 'Temperature', 'DewPoint', 'Wind_U', 'Wind_V', 'CO', 'NO2', 'SO2', 'O3', 'HCHO'
    value NUMERIC(12, 6),
    unit VARCHAR(20) NOT NULL,                          -- 'K', 'm/s', 'mol/m²'
    measurement_type VARCHAR(50) NOT NULL,              -- 'satellite_column', 'reanalysis_meteorology'
    observed_at TIMESTAMPTZ NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    geom GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    dataset_id VARCHAR(50) NOT NULL REFERENCES environmental_datasets(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_met_obs UNIQUE (source_station_name, variable_name, observed_at)
);

CREATE INDEX IF NOT EXISTS idx_met_obs_geom ON meteorological_observations USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_met_obs_var_time ON meteorological_observations(variable_name, observed_at);
CREATE INDEX IF NOT EXISTS idx_met_obs_city ON meteorological_observations(city);
