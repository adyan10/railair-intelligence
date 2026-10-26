/**
 * RailAir Intelligence — Dataset Registry & Geographic Coverage Strategy
 *
 * Implements the coverage-aware metadata model for environmental datasets,
 * maintaining strict scientific provenance and distinguishing between:
 *   - Ground-station observations (CPCB CAAQMS)
 *   - Satellite column observations (Sentinel-5P TROPOMI)
 *   - Reanalysis meteorological products (ECMWF ERA5)
 *   - Historical modelled concentration estimates (Zenodo Gridded PM)
 *
 * Prevents geographic extrapolation when zooming out across regional,
 * national, or global viewports.
 */

import type { DatasetMetadata, GridCellBounds } from '../types/environmental';
import { CORRIDOR_ENVELOPE } from './rasterInterpolation';

export const CORRIDOR_BOUNDS: GridCellBounds = {
  south: CORRIDOR_ENVELOPE.south,
  west: CORRIDOR_ENVELOPE.west,
  north: CORRIDOR_ENVELOPE.north,
  east: CORRIDOR_ENVELOPE.east,
};

/**
 * Verified environmental datasets documented in the repository scientific audit.
 */
export const ENVIRONMENTAL_DATASETS: Record<string, DatasetMetadata> = {
  zenodo_gridded_pm_v2: {
    dataset_id: 'zenodo_gridded_pm_v2',
    title: 'Monthly Gridded PM2.5 and PM10 Surface Concentrations over India (2017–2022)',
    short_name: 'Zenodo 10km Gridded PM (Corridor Extraction)',
    publisher: 'Zenodo Open Science Repository / Atmospheric Science Consortium',
    source_url: 'https://doi.org/10.5281/zenodo.10515152',
    license: 'Creative Commons Attribution 4.0 International (CC-BY 4.0)',
    variables: ['PM2.5', 'PM10'],
    units: 'µg/m³',
    temporal_coverage: {
      start: '2017-01',
      end: '2022-12',
      total_periods: 72,
      period_type: 'monthly',
    },
    spatial_coverage: {
      name: 'Meerut–Ghaziabad–Delhi Railway Corridor (Delhi-NCR)',
      bounds: CORRIDOR_BOUNDS,
      resolution_km: 10,
      node_count: 64,
      scope: 'regional_corridor',
    },
    measurement_type: 'modelled_estimate',
    measurement_label: 'Historical modelled estimates · 2017–2022',
    methodology:
      'Aerosol optical depth (AOD from MODIS/MISR/VIIRS) combined with chemical transport modeling and CPCB calibration curves, extracted onto a regular 8×8 grid.',
    no_data_handling:
      'Zero-fill or null preservation; strictly confined to 64 verified corridor coordinates without spatial extrapolation.',
    provenance_notes:
      'Extracted from 12 NetCDF-1 files in backend-resources/zeonodo-data2. Verified 100% spatial and temporal completeness.',
    is_active: true,
    is_available: true,
  },

  cpcb_caaqms_realtime: {
    dataset_id: 'cpcb_caaqms_realtime',
    title: 'Real-Time Ambient Air Quality Data across India (CAAQMS Network)',
    short_name: 'CPCB CAAQMS Ground Monitors',
    publisher: 'Central Pollution Control Board (CPCB), MoEFCC via data.gov.in',
    source_url: 'https://data.gov.in/resource/real-time-ambient-air-quality-data-various-monitoring-stations',
    license: 'Government Open Data License - India (GODL / NDSAP)',
    variables: ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3', 'NH3'],
    units: 'µg/m³ (CO: mg/m³)',
    temporal_coverage: {
      start: 'Current Telemetry Snapshot',
      end: 'Hourly Telemetry',
      total_periods: 1,
      period_type: 'hourly_telemetry',
    },
    spatial_coverage: {
      name: 'National Ground Station Network (506 Stations India-wide / 52 in NCR)',
      bounds: { south: 8.0, west: 68.0, north: 37.0, east: 97.0 },
      resolution_km: 'Point in-situ monitor',
      scope: 'point_national',
    },
    measurement_type: 'ground_observation',
    measurement_label: 'Ground-station CAAQMS in-situ observations',
    methodology:
      'Continuous automated regulatory ambient air quality monitoring instruments (BAM/TEOM for particulate matter, UV/chemiluminescence for gases).',
    no_data_handling: 'Reported as NA or flagged when sensors undergo zero-calibration or maintenance.',
    provenance_notes:
      'Direct ground-truth reference from backend-resources/data-gov-in. Used for station-level validation against modelled fields.',
    is_active: false,
    is_available: true,
  },

  mendeley_satellite_gases: {
    dataset_id: 'mendeley_satellite_gases',
    title: 'Multi-Pollutant and Meteorological Variables for Indian Cities (2023–2025)',
    short_name: 'Mendeley Sentinel-5P Satellite & ERA5',
    publisher: 'Mendeley Data / Copernicus Sentinel-5P / ECMWF ERA5-Land',
    source_url: 'https://doi.org/10.17632/6z99bsw36b.1',
    license: 'Creative Commons Attribution 4.0 International (CC-BY 4.0)',
    variables: ['NO2', 'CO', 'SO2', 'O3', 'HCHO', 'Temperature', 'Wind_U', 'Wind_V'],
    units: 'mol/m² (Gases) / K, m/s (Meteorology)',
    temporal_coverage: {
      start: '2023-01',
      end: '2025-12',
      total_periods: 36,
      period_type: 'monthly',
    },
    spatial_coverage: {
      name: 'Indian Metropolitan Station Buffers',
      bounds: { south: 8.0, west: 68.0, north: 37.0, east: 97.0 },
      resolution_km: 'Zonal column extraction (Sentinel-5P resolution)',
      scope: 'point_national',
    },
    measurement_type: 'satellite',
    measurement_label: 'Satellite tropospheric columns & ERA5 reanalysis',
    methodology:
      'Google Earth Engine monthly zonal extraction of Copernicus Sentinel-5P TROPOMI column densities and ERA5-Land reanalysis. NOTE: Particulate matter (PM2.5/PM10) is absent.',
    no_data_handling: 'Zonal mean with cloud fraction filtering (< 0.3).',
    provenance_notes:
      'Audited in backend-resources/mendeley-pollution-data. Contains gaseous columns; no particulate matter.',
    is_active: false,
    is_available: true,
  },

  zenodo_pm25_ml_benchmark: {
    dataset_id: 'zenodo_pm25_ml_benchmark',
    title: 'Machine-Learning High-Resolution PM2.5 Surface Estimate over India (Release 2026-07)',
    short_name: 'Zenodo ML National Benchmark (EPSG:7755)',
    publisher: 'Zenodo Open Science Repository',
    source_url: 'https://zenodo.org/records/benchmark-pm25-india',
    license: 'Creative Commons Attribution 4.0 International (CC-BY 4.0)',
    variables: ['PM2.5'],
    units: 'µg/m³',
    temporal_coverage: {
      start: 'Benchmark Release',
      end: 'Benchmark Release',
      total_periods: 1,
      period_type: 'static_benchmark',
    },
    spatial_coverage: {
      name: 'Indian National Domain (Lambert Conformal Conic)',
      bounds: { south: 8.0, west: 68.0, north: 37.0, east: 97.0 },
      resolution_km: 1,
      scope: 'national_india',
    },
    measurement_type: 'modelled_estimate',
    measurement_label: 'Machine-learning modelled surface estimate',
    methodology:
      'High-resolution ML model (R² = 0.608, RMSE = 26.55 µg/m³) projected in Survey of India Lambert Conformal Conic (EPSG:7755).',
    no_data_handling: 'Grid cells outside national maritime borders masked.',
    provenance_notes:
      'Archived benchmark dataset (304 MB HDF5 NetCDF-4) requiring reprojection into WGS84 for direct Leaflet integration.',
    is_active: false,
    is_available: false,
  },
};

export type ZoomScaleTier = 'corridor' | 'regional_ncr' | 'national_india';

export interface ZoomScaleState {
  tier: ZoomScaleTier;
  zoom: number;
  label: string;
  isOutsideCorridor: boolean;
  message: string;
  coverageBadge: string;
}

/**
 * Determines current zoom tier and geographic coverage state.
 *
 * Tier definitions:
 *   - 'corridor' (zoom >= 9): Local corridor focus (83 km Meerut-Delhi). Stations, tracks, node inspection.
 *   - 'regional_ncr' (zoom 7-8): Wider NCR view. Pollution field strictly confined to footprint with visible boundary.
 *   - 'national_india' (zoom <= 6): Zoomed out to India or globe. Clearly notifies that regional model is active.
 */
export function getZoomScaleState(zoom: number): ZoomScaleState {
  if (zoom >= 9) {
    return {
      tier: 'corridor',
      zoom,
      label: 'Corridor Focus View',
      isOutsideCorridor: false,
      message: 'Active view covers the 83 km Meerut–Ghaziabad–Delhi railway corridor.',
      coverageBadge: 'Corridor Extent · 10 km Grid (64 Nodes)',
    };
  } else if (zoom >= 7) {
    return {
      tier: 'regional_ncr',
      zoom,
      label: 'Wider Delhi-NCR View',
      isOutsideCorridor: true,
      message:
        'Viewing wider Delhi-NCR. Modelled pollution field is strictly confined to the 64-node corridor footprint.',
      coverageBadge: 'Regional Footprint · Surrounding Basemap Visible',
    };
  } else {
    return {
      tier: 'national_india',
      zoom,
      label: 'National / Global View',
      isOutsideCorridor: true,
      message:
        'Regional dataset active: Viewport extends beyond the 83 km corridor. No national coverage exists for this historical series.',
      coverageBadge: 'National View · Regional Data Confined',
    };
  }
}

/**
 * Checks if a coordinate falls strictly within the active corridor dataset coverage.
 */
export function isCoordinateWithinCoverage(lat: number, lon: number): boolean {
  const { south, north, west, east } = CORRIDOR_BOUNDS;
  return lat >= south && lat <= north && lon >= west && lon <= east;
}

/**
 * Returns all registered dataset metadata objects.
 */
export function getAllDatasets(): DatasetMetadata[] {
  return Object.values(ENVIRONMENTAL_DATASETS);
}

/**
 * Returns the currently active primary dataset metadata.
 */
export function getActiveDataset(): DatasetMetadata {
  return ENVIRONMENTAL_DATASETS.zenodo_gridded_pm_v2;
}
