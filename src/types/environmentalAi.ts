/**
 * RailAir Intelligence — Environmental AI Types
 * Matches the backend Environmental AI FastAPI endpoints:
 *   - GET /api/v1/environmental/ai/analysis
 *   - GET /api/v1/environmental/ai/forecast
 *   - GET /api/v1/environmental/ai/advisory
 */

export type DataKindType = 'measured' | 'modelled' | 'forecast';
export type RiskCategory = 'low' | 'moderate' | 'elevated' | 'high' | 'critical' | 'insufficient_data';
export type AnomalyStatus = 'normal' | 'mild_anomaly' | 'significant_anomaly' | 'insufficient_history';

export interface DescriptiveStats {
  count: number;
  valid_count: number;
  null_count: number;
  unit: string;
  mean: number | null;
  median: number | null;
  std_dev: number | null;
  min_value: number | null;
  max_value: number | null;
  p25: number | null;
  p75: number | null;
  iqr: number | null;
}

export interface SeasonalTrend {
  season_name: string;
  months: number[];
  mean_concentration: number | null;
  valid_observations: number;
  unit: string;
}

export interface MonthlyClimatologyItem {
  month: number;
  month_name: string;
  historical_mean: number;
  historical_std: number;
  historical_min: number;
  historical_max: number;
  unit: string;
  years_represented: number;
}

export interface AnomalyResult {
  target_period: string;
  target_value: number;
  unit: string;
  baseline_month: number;
  baseline_mean: number;
  baseline_std: number;
  deviation: number;
  z_score: number;
  anomaly_status: AnomalyStatus;
  note: string;
}

export interface EnvironmentalAnalysisResponse {
  dataset_id: string;
  pollutant: string;
  unit: string;
  data_kind: DataKindType;
  spatial_scope: string;
  temporal_coverage: string;
  stats: DescriptiveStats;
  seasonal_trends: SeasonalTrend[];
  climatology: MonthlyClimatologyItem[];
  recent_anomalies: AnomalyResult[];
  limitations: string[];
  freshness_timestamp: string;
}

export interface ModelEvaluationMetrics {
  model_name: string;
  evaluation_type: 'chronological_train_test_split';
  train_period_range: string;
  test_period_range: string;
  train_observations: number;
  test_observations: number;
  mae: number;
  rmse: number;
  unit: string;
}

export interface ForecastPoint {
  period: string;
  step_ahead: number;
  forecast_value: number;
  lower_bound: number;
  upper_bound: number;
  unit: string;
  category: string;
  color: string;
}

export interface ForecastResponse {
  pollutant: string;
  unit: string;
  spatial_entity_id: string;
  forecast_resolution: 'monthly_mean';
  data_kind: 'forecast';
  selected_model: string;
  evaluation: ModelEvaluationMetrics;
  alternative_model_evaluations: ModelEvaluationMetrics[];
  horizon_months: number;
  forecast_points: ForecastPoint[];
  limitations: string[];
  uncertainty_statement: string;
}

export interface SensitiveGroupGuidance {
  group_name: string;
  precaution: string;
}

export interface HealthRiskAdvisoryResponse {
  pollutant: string;
  concentration: number | null;
  unit: string;
  averaging_period: string;
  data_basis: 'observed_ground' | 'modelled_gridded' | 'statistical_forecast';
  cpcb_category: string;
  risk_level: RiskCategory;
  color: string;
  applicable_naaqs_standard: number | null;
  standard_reference: string;
  exceedance_status: 'within_standard' | 'exceeds_standard' | 'unverified_averaging_period' | 'insufficient_data';
  general_public_advisory: string;
  sensitive_groups_guidance: SensitiveGroupGuidance[];
  data_timestamp: string;
  confidence_level: 'high' | 'medium' | 'low' | 'unvalidated';
  limitations: string[];
  disclaimer: string;
}
