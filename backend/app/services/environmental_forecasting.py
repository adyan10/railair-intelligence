"""RailAir Intelligence — Statistical Environmental Forecasting Engine.

Provides mathematically rigorous, chronologically evaluated time-series forecasting
for monthly particulate matter (PM2.5 / PM10) using the 72-month gridded dataset (2017–2022).

Methodological Integrity:
1. Strict chronological train/test split (Train: 2017–2021, 60 months; Held-out Test: 2022, 12 months).
   No random shuffling or future leakage.
2. Baselines evaluated:
   - Model 1: Seasonal-Naive Baseline (s-naive, y_t = y_{t-12})
   - Model 2: Climatological Multi-Year Monthly Mean (5-year training month average)
3. Truly out-of-sample held-out performance metrics (MAE, RMSE).
4. Point forecasts with ~95% prediction intervals (1.96 * RMSE_test).
5. Explicit rejection of single-timestamp CPCB ground snapshot for temporal forecasting.
"""
import calendar
import logging
import math
from typing import List, Dict, Any, Optional, Tuple

from ..models.ai_schemas import (
    ModelEvaluationMetrics,
    ForecastPoint,
    ForecastResponse,
)
from .environmental_service import environmental_service, classify_aqi_category, interpolate_ramp_color_hex

logger = logging.getLogger(__name__)


def evaluate_forecast_models(
    series: List[Dict[str, Any]],
    unit: str = "µg/m³",
) -> Tuple[ModelEvaluationMetrics, ModelEvaluationMetrics, str]:
    """Chronologically splits series into Train (2017–2021) and Test (2022).
    
    Evaluates Seasonal-Naive vs Climatological Mean on held-out 2022 test set.
    Returns (seasonal_naive_metrics, climatology_metrics, best_model_name).
    """
    # Filter valid points with year and month
    clean_series = [
        s for s in series
        if s.get("year") is not None and s.get("month") is not None and s.get("value") is not None and not math.isnan(float(s["value"]))
    ]
    clean_series.sort(key=lambda x: (x["year"], x["month"]))

    train_pts = [s for s in clean_series if s["year"] <= 2021]
    test_pts = [s for s in clean_series if s["year"] == 2022]

    if len(train_pts) < 24 or len(test_pts) < 6:
        raise ValueError("Insufficient temporal history for validated chronological forecasting (requires >= 24 train, >= 6 test months).")

    # Build lookup table for training set
    # 1. Seasonal naive lookup: last available year in training (2021) for each month
    s_naive_train_lookup: Dict[int, float] = {}
    for s in train_pts:
        if s["year"] == 2021:
            s_naive_train_lookup[s["month"]] = float(s["value"])

    # 2. Climatology lookup: multi-year training mean for each month
    clim_month_vals: Dict[int, List[float]] = {m: [] for m in range(1, 13)}
    for s in train_pts:
        clim_month_vals[s["month"]].append(float(s["value"]))
    clim_train_lookup = {
        m: sum(vals) / len(vals) for m, vals in clim_month_vals.items() if vals
    }

    # Evaluate on held-out 2022 test set
    s_naive_errors: List[float] = []
    clim_errors: List[float] = []

    for actual in test_pts:
        m = actual["month"]
        y_true = float(actual["value"])

        if m in s_naive_train_lookup:
            y_hat_s = s_naive_train_lookup[m]
            s_naive_errors.append(y_true - y_hat_s)

        if m in clim_train_lookup:
            y_hat_c = clim_train_lookup[m]
            clim_errors.append(y_true - y_hat_c)

    # Compute MAE and RMSE
    s_mae = round(sum(abs(e) for e in s_naive_errors) / len(s_naive_errors), 2)
    s_rmse = round(math.sqrt(sum(e ** 2 for e in s_naive_errors) / len(s_naive_errors)), 2)

    c_mae = round(sum(abs(e) for e in clim_errors) / len(clim_errors), 2)
    c_rmse = round(math.sqrt(sum(e ** 2 for e in clim_errors) / len(clim_errors)), 2)

    s_metrics = ModelEvaluationMetrics(
        model_name="Seasonal-Naive Baseline (s-naive)",
        evaluation_type="chronological_train_test_split",
        train_period_range="2017-01 to 2021-12",
        test_period_range="2022-01 to 2022-12",
        train_observations=len(train_pts),
        test_observations=len(test_pts),
        mae=s_mae,
        rmse=s_rmse,
        unit=unit,
    )

    c_metrics = ModelEvaluationMetrics(
        model_name="Climatological Multi-Year Mean",
        evaluation_type="chronological_train_test_split",
        train_period_range="2017-01 to 2021-12",
        test_period_range="2022-01 to 2022-12",
        train_observations=len(train_pts),
        test_observations=len(test_pts),
        mae=c_mae,
        rmse=c_rmse,
        unit=unit,
    )

    # Select best model based on held-out RMSE
    best_model = "Seasonal-Naive Baseline (s-naive)" if s_rmse <= c_rmse else "Climatological Multi-Year Mean"
    return s_metrics, c_metrics, best_model


def generate_forecast_trajectory(
    series: List[Dict[str, Any]],
    horizon_months: int = 6,
    pollutant: str = "PM2.5",
    unit: str = "µg/m³",
) -> ForecastResponse:
    """Generates statistical point forecasts with empirical prediction intervals."""
    if horizon_months < 1 or horizon_months > 12:
        raise ValueError("Forecast horizon must be between 1 and 12 months.")

    clean_series = [
        s for s in series
        if s.get("year") is not None and s.get("month") is not None and s.get("value") is not None and not math.isnan(float(s["value"]))
    ]
    clean_series.sort(key=lambda x: (x["year"], x["month"]))

    if len(clean_series) < 24:
        raise ValueError("Series requires at least 24 longitudinal months to generate a validated seasonal forecast.")

    # Run chronological evaluation
    s_metrics, c_metrics, best_name = evaluate_forecast_models(clean_series, unit=unit)

    # Chosen evaluation metrics for uncertainty intervals
    selected_eval = s_metrics if best_name.startswith("Seasonal-Naive") else c_metrics
    alt_eval = c_metrics if best_name.startswith("Seasonal-Naive") else s_metrics
    test_rmse = selected_eval.rmse

    # Get last known observation period (e.g. 2022-12)
    last_obs = clean_series[-1]
    last_year = last_obs["year"]
    last_month = last_obs["month"]

    # Recent history for seasonal recurrence (last 12 months of actuals, 2022)
    recent_12_months = {
        s["month"]: float(s["value"])
        for s in clean_series[-12:]
    }

    # Full history climatology by month
    month_groups: Dict[int, List[float]] = {m: [] for m in range(1, 13)}
    for s in clean_series:
        month_groups[s["month"]].append(float(s["value"]))
    climatology = {m: sum(vals) / len(vals) for m, vals in month_groups.items()}

    forecast_points: List[ForecastPoint] = []
    curr_y = last_year
    curr_m = last_month

    for h in range(1, horizon_months + 1):
        curr_m += 1
        if curr_m > 12:
            curr_m = 1
            curr_y += 1

        target_period = f"{curr_y}-{curr_m:02d}"

        # Point forecast calculation:
        # If best model is seasonal-naive: take last year's same month
        # If climatological: take full-series multi-year monthly mean
        if best_name.startswith("Seasonal-Naive") and curr_m in recent_12_months:
            pt_est = recent_12_months[curr_m]
        else:
            pt_est = climatology.get(curr_m, 100.0)

        pt_est = round(pt_est, 2)

        # 95% empirical prediction interval based on held-out test RMSE
        # Lower bound clamped at 0.0 (concentration cannot be negative)
        lb = round(max(0.0, pt_est - 1.96 * test_rmse), 2)
        ub = round(pt_est + 1.96 * test_rmse, 2)

        cat_name, _ = classify_aqi_category(pollutant, pt_est)
        color_hex = interpolate_ramp_color_hex(pollutant, pt_est)

        forecast_points.append(
            ForecastPoint(
                period=target_period,
                step_ahead=h,
                forecast_value=pt_est,
                lower_bound=lb,
                upper_bound=ub,
                unit=unit,
                category=cat_name,
                color=color_hex,
            )
        )

    return ForecastResponse(
        pollutant=pollutant,
        unit=unit,
        spatial_entity_id="corridor_grid_regional",
        forecast_resolution="monthly_mean",
        data_kind="forecast",
        selected_model=best_name,
        evaluation=selected_eval,
        alternative_model_evaluations=[alt_eval],
        horizon_months=horizon_months,
        forecast_points=forecast_points,
        limitations=[
            "Statistical forecast operates strictly at monthly resolution based on 2017–2022 IIT Delhi / Zenodo gridded data.",
            "Cannot predict sub-monthly events, diurnal spikes, or real-time localized weather anomalies.",
            "Uncertainty intervals (~95%) are derived from out-of-sample empirical errors on the genuinely held-out 2022 test year.",
            "Stationary meteorological assumption: does not simulate future climate shifts or unforeseen policy interventions.",
        ],
        uncertainty_statement=(
            f"Evaluated out-of-sample on 12 held-out months (2022). "
            f"Held-out MAE: {selected_eval.mae} {unit}, RMSE: {selected_eval.rmse} {unit}."
        ),
    )


class EnvironmentalForecastingService:
    """Service facade for environmental statistical forecasting."""

    def forecast_gridded(
        self,
        pollutant: str = "PM2.5",
        grid_id: Optional[str] = None,
        horizon_months: int = 6,
    ) -> ForecastResponse:
        """Forecasts monthly mean particulate concentrations using validated historical gridded data."""
        p_clean = pollutant.strip().upper()
        if p_clean not in ("PM2.5", "PM10"):
            p_clean = "PM2.5"

        g_id = grid_id or "grid_28.67_77.44"
        ts_resp = environmental_service.get_timeseries(pollutant=p_clean, grid_id=g_id)
        if not ts_resp:
            ts_resp = environmental_service.get_timeseries(pollutant=p_clean)

        records = [
            {
                "period": pt.period,
                "year": pt.year,
                "month": pt.month,
                "value": pt.value,
            }
            for pt in ts_resp.timeseries
        ]

        resp = generate_forecast_trajectory(
            series=records,
            horizon_months=horizon_months,
            pollutant=p_clean,
            unit="µg/m³",
        )
        resp.spatial_entity_id = g_id
        return resp

    def forecast_ground_stations(self, *args, **kwargs):
        """Explicitly guards and rejects forecasting on single-timestamp CPCB ground snapshot."""
        raise ValueError(
            "The CPCB ground observation dataset is a single statutory snapshot timestamp (2026-10-24 21:30:00 UTC). "
            "It does not contain longitudinal time-series observations and cannot be used for temporal forecasting. "
            "Use the 2017–2022 monthly gridded dataset for validated statistical forecasting."
        )


environmental_forecasting_service = EnvironmentalForecastingService()
