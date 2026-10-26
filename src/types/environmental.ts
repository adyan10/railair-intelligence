/**
 * RailAir Intelligence — Environmental Types
 * Matches the backend Environmental Explorer and Command Centre schemas.
 */

export type EnvironmentalPollutant = 'PM2.5' | 'PM10';

export interface EnvironmentalPeriod {
  period: string; // "YYYY-MM"
  year: number;
  month: number;
  label: string; // e.g. "Jan 2017"
  timestamp: string; // ISO 8601
}

export interface GridCellBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface GridCellRecord {
  grid_id: string;
  latitude: number;
  longitude: number;
  bounds: GridCellBounds;
  value: number | null;
  unit: string;
  category: string;
  color: string;
  nearest_station: string | null;
  distance_to_station_km: number | null;
}

export interface RegionalSummary {
  mean: number;
  median: number;
  min: number;
  max: number;
  std_dev: number;
  valid_cells: number;
  total_cells: number;
  no_data_cells: number;
  coverage_pct: number;
  unit: string;
  cpcb_dominant_category: string;
}

export interface EnvironmentalGridResponse {
  dataset_id: string;
  pollutant: EnvironmentalPollutant;
  unit: string;
  year: number;
  month: number;
  period: string;
  total_cells: number;
  summary: RegionalSummary;
  cells: GridCellRecord[];
}

export interface TimeSeriesPoint {
  period: string;
  year: number;
  month: number;
  value: number | null;
  unit: string;
  category: string;
}

export interface EnvironmentalTimeSeriesResponse {
  dataset_id: string;
  pollutant: EnvironmentalPollutant;
  unit: string;
  grid_id: string;
  latitude: number;
  longitude: number;
  total_points: number;
  timeseries: TimeSeriesPoint[];
  overall_mean: number;
  overall_min: number;
  overall_max: number;
  winter_peak_mean: number;
  monsoon_dip_mean: number;
}

export interface HotspotRankItem {
  rank: number;
  grid_id: string;
  latitude: number;
  longitude: number;
  value: number;
  unit: string;
  category: string;
  color: string;
  nearest_canonical_station_id: string | null;
  distance_to_canonical_km: number | null;
}

export interface EnvironmentalHotspotsResponse {
  dataset_id: string;
  pollutant: EnvironmentalPollutant;
  unit: string;
  year: number;
  month: number;
  period: string;
  total_hotspots: number;
  items: HotspotRankItem[];
}

export interface LocationInspectionResponse {
  dataset_id: string;
  pollutant: EnvironmentalPollutant;
  unit: string;
  period: string;
  query_latitude: number;
  query_longitude: number;
  grid_id: string;
  cell_latitude: number;
  cell_longitude: number;
  cell_bounds: GridCellBounds;
  value: number | null;
  category: string;
  color: string;
  distance_to_query_km: number;
  nearest_station: string | null;
  distance_to_station_km: number | null;
  timeseries: TimeSeriesPoint[];
}

export interface CanonicalStation {
  id: string;
  ir_code?: string;
  name: string;
  lat: number;
  lng: number;
  city: string;
}

export interface CorridorStationComparison {
  station_id: string;
  ir_code?: string;
  station_name: string;
  city: string;
  latitude: number;
  longitude: number;
  grid_id: string | null;
  ambient_grid_value: number | null;
  unit: string;
  category: string;
  color: string;
  distance_to_cell_km: number | null;
}

export type MeasurementType =
  | 'modelled_estimate'
  | 'ground_observation'
  | 'satellite'
  | 'reanalysis'
  | 'simulated';

export type DatasetCoverageScope =
  | 'regional_corridor'
  | 'point_national'
  | 'national_india'
  | 'global';

export interface DatasetTemporalCoverage {
  start: string;
  end: string;
  total_periods: number;
  period_type: 'monthly' | 'hourly_telemetry' | 'static_benchmark';
}

export interface DatasetSpatialCoverage {
  name: string;
  bounds: GridCellBounds;
  resolution_km: number | string;
  node_count?: number;
  scope: DatasetCoverageScope;
}

export interface DatasetMetadata {
  dataset_id: string;
  title: string;
  short_name: string;
  publisher: string;
  source_url: string;
  license: string;
  variables: string[];
  units: string;
  temporal_coverage: DatasetTemporalCoverage;
  spatial_coverage: DatasetSpatialCoverage;
  measurement_type: MeasurementType;
  measurement_label: string;
  methodology: string;
  no_data_handling: string;
  provenance_notes: string;
  is_active: boolean;
  is_available: boolean;
}
