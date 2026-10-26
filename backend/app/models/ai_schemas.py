"""Pydantic schemas for RailAir Environmental Intelligence & Analysis Engine.

Covers:
1. Environmental statistical analysis and seasonal anomaly detection.
2. Chronologically evaluated statistical forecasting with genuine held-out metrics.
3. Deterministic health risk assessment and evidence-based public advisories.
"""
from typing import List, Dict, Optional, Literal, Any
from pydantic import BaseModel, Field, ConfigDict

DataKindType = Literal["measured", "modelled", "forecast"]
RiskCategory = Literal["low", "moderate", "elevated", "high", "critical", "insufficient_data"]
AnomalyStatus = Literal["normal", "mild_anomaly", "significant_anomaly", "insufficient_history"]


class DescriptiveStats(BaseModel):
    count: int = Field(..., description="Total observations considered")
    valid_count: int = Field(..., description="Valid non-null readings")
    null_count: int = Field(..., description="Missing or NA readings preserved")
    unit: str = Field(..., description="Measurement unit (e.g. µg/m³, mg/m³)")
    mean: Optional[float] = Field(None, description="Arithmetic mean")
    median: Optional[float] = Field(None, description="50th percentile")
    std_dev: Optional[float] = Field(None, description="Sample standard deviation")
    min_value: Optional[float] = Field(None, description="Minimum reading")
    max_value: Optional[float] = Field(None, description="Maximum reading")
    p25: Optional[float] = Field(None, description="25th percentile")
    p75: Optional[float] = Field(None, description="75th percentile")
    iqr: Optional[float] = Field(None, description="Interquartile range")

    model_config = ConfigDict(populate_by_name=True)


class SeasonalTrend(BaseModel):
    season_name: str = Field(..., description="Winter, Pre-Monsoon, Monsoon, Post-Monsoon")
    months: List[int] = Field(..., description="Calendar months in season, e.g. [12, 1, 2]")
    mean_concentration: Optional[float] = Field(None, description="Seasonal average")
    valid_observations: int = Field(...)
    unit: str

    model_config = ConfigDict(populate_by_name=True)


class MonthlyClimatologyItem(BaseModel):
    month: int = Field(..., ge=1, le=12)
    month_name: str
    historical_mean: float
    historical_std: float
    historical_min: float
    historical_max: float
    unit: str
    years_represented: int

    model_config = ConfigDict(populate_by_name=True)


class AnomalyResult(BaseModel):
    target_period: str = Field(..., description="Period evaluated, e.g. '2022-12'")
    target_value: float = Field(..., description="Recorded concentration")
    unit: str
    baseline_month: int
    baseline_mean: float
    baseline_std: float
    deviation: float = Field(..., description="target_value - baseline_mean")
    z_score: float = Field(..., description="(target_value - baseline_mean) / baseline_std")
    anomaly_status: AnomalyStatus
    note: str = Field(
        default="Statistical anomaly denotes mathematical variance from historical baseline, not an immediate health emergency."
    )

    model_config = ConfigDict(populate_by_name=True)


class EnvironmentalAnalysisResponse(BaseModel):
    dataset_id: str
    pollutant: str
    unit: str
    data_kind: DataKindType
    spatial_scope: str
    temporal_coverage: str
    stats: DescriptiveStats
    seasonal_trends: List[SeasonalTrend]
    climatology: List[MonthlyClimatologyItem]
    recent_anomalies: List[AnomalyResult]
    limitations: List[str]
    freshness_timestamp: str

    model_config = ConfigDict(populate_by_name=True)


# ==============================================================================
# Forecasting Schemas
# ==============================================================================

class ModelEvaluationMetrics(BaseModel):
    model_name: str
    evaluation_type: Literal["chronological_train_test_split"]
    train_period_range: str
    test_period_range: str
    train_observations: int
    test_observations: int
    mae: float = Field(..., description="Mean Absolute Error on held-out test set")
    rmse: float = Field(..., description="Root Mean Squared Error on held-out test set")
    unit: str

    model_config = ConfigDict(populate_by_name=True)


class ForecastPoint(BaseModel):
    period: str = Field(..., description="Forecast period, e.g. '2023-01'")
    step_ahead: int = Field(..., ge=1, description="Horizon step (1 = 1 month ahead)")
    forecast_value: float = Field(..., description="Point estimate")
    lower_bound: float = Field(..., description="Lower prediction interval bound (~95% confidence)")
    upper_bound: float = Field(..., description="Upper prediction interval bound (~95% confidence)")
    unit: str
    category: str
    color: str

    model_config = ConfigDict(populate_by_name=True)


class ForecastResponse(BaseModel):
    pollutant: str
    unit: str
    spatial_entity_id: str = Field(..., description="grid_id or regional identifier")
    forecast_resolution: Literal["monthly_mean"]
    data_kind: Literal["forecast"]
    selected_model: str
    evaluation: ModelEvaluationMetrics
    alternative_model_evaluations: List[ModelEvaluationMetrics] = Field(default_factory=list)
    horizon_months: int
    forecast_points: List[ForecastPoint]
    limitations: List[str]
    uncertainty_statement: str

    model_config = ConfigDict(populate_by_name=True)


# ==============================================================================
# Deterministic Health Risk & Public Advisory Schemas
# ==============================================================================

class SensitiveGroupGuidance(BaseModel):
    group_name: str
    precaution: str

    model_config = ConfigDict(populate_by_name=True)


class HealthRiskAdvisoryResponse(BaseModel):
    pollutant: str
    concentration: Optional[float]
    unit: str
    averaging_period: str = Field(..., description="e.g. 24_hour_mean, monthly_mean, 1_hour_snapshot")
    data_basis: Literal["observed_ground", "modelled_gridded", "statistical_forecast"]
    cpcb_category: str = Field(..., description="Good, Satisfactory, Moderate, Poor, Very Poor, Severe")
    risk_level: RiskCategory
    color: str
    applicable_naaqs_standard: Optional[float] = Field(None, description="Statutory standard threshold")
    standard_reference: str = Field(
        default="CPCB National Ambient Air Quality Standards (NAAQS 2009) & National AQI Guidelines"
    )
    exceedance_status: Literal["within_standard", "exceeds_standard", "unverified_averaging_period", "insufficient_data"]
    general_public_advisory: str
    sensitive_groups_guidance: List[SensitiveGroupGuidance]
    data_timestamp: str
    confidence_level: Literal["high", "medium", "low", "unvalidated"]
    limitations: List[str]
    disclaimer: str = Field(
        default=(
            "Advisories provide evidence-based population-level environmental guidance aligned with CPCB criteria. "
            "They do not constitute individual medical diagnoses or clinical prognoses."
        )
    )

    model_config = ConfigDict(populate_by_name=True)
