"""Automated unit and integration tests for RailAir Environmental Intelligence Engine.

Covers:
1. Descriptive statistics & strict null preservation (never converts None to 0.0).
2. Seasonal aggregation & 12-month historical climatology.
3. Standardized anomaly detection (z-scores against month-of-year baseline).
4. Chronological train/test split and held-out evaluation (MAE, RMSE).
5. Forecast generation, uncertainty bounds, and horizon validation.
6. Rejection of single-timestamp CPCB ground snapshot for forecasting.
7. Deterministic CPCB health-risk assessment and public advisories.
8. Averaging period matching & unverified period handling.
9. FastAPI endpoints integration tests (/analysis, /forecast, /advisory).
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.environmental_analysis import (
    compute_descriptive_stats,
    compute_seasonal_breakdown,
    compute_monthly_climatology,
    detect_anomalies,
    environmental_analysis_service,
)
from app.services.environmental_forecasting import (
    evaluate_forecast_models,
    generate_forecast_trajectory,
    environmental_forecasting_service,
)
from app.services.risk_advisory import (
    health_risk_advisory_service,
    CPCB_NAAQS_STANDARDS,
)


@pytest.fixture
def client():
    return TestClient(app)


# ==============================================================================
# 1. Descriptive Statistics & Null Handling Tests
# ==============================================================================

def test_descriptive_stats_with_known_vector():
    """Validates mean, median, stdev, quartiles on known deterministic values."""
    # Vector: [10, 20, 30, 40, 50]
    vals = [10.0, 20.0, 30.0, 40.0, 50.0]
    stats = compute_descriptive_stats(vals, unit="µg/m³")

    assert stats.count == 5
    assert stats.valid_count == 5
    assert stats.null_count == 0
    assert stats.mean == 30.0
    assert stats.median == 30.0
    assert stats.min_value == 10.0
    assert stats.max_value == 50.0
    assert stats.p25 == 20.0
    assert stats.p75 == 40.0
    assert stats.iqr == 20.0
    assert stats.std_dev == 15.81


def test_descriptive_stats_strict_null_preservation():
    """Ensures missing/null values are strictly preserved and never coerced to 0.0."""
    vals = [50.0, None, 100.0, None, 150.0]
    stats = compute_descriptive_stats(vals, unit="µg/m³")

    assert stats.count == 5
    assert stats.valid_count == 3
    assert stats.null_count == 2
    # Mean of 50, 100, 150 is 100.0 (if null was coerced to 0, mean would be 60.0)
    assert stats.mean == 100.0
    assert stats.median == 100.0
    assert stats.min_value == 50.0
    assert stats.max_value == 150.0


def test_descriptive_stats_all_nulls():
    """Handles an all-null vector gracefully without division-by-zero errors."""
    vals = [None, None, None]
    stats = compute_descriptive_stats(vals, unit="µg/m³")

    assert stats.count == 3
    assert stats.valid_count == 0
    assert stats.null_count == 3
    assert stats.mean is None
    assert stats.median is None
    assert stats.std_dev is None


# ==============================================================================
# 2. Seasonal Aggregation & Climatology Tests
# ==============================================================================

def test_seasonal_breakdown_known_months():
    """Verifies assignment of months to Indian meteorological seasons."""
    records = [
        {"year": 2020, "month": 1, "value": 150.0},  # Winter
        {"year": 2020, "month": 2, "value": 130.0},  # Winter
        {"year": 2020, "month": 4, "value": 70.0},   # Pre-Monsoon
        {"year": 2020, "month": 7, "value": 30.0},   # Monsoon
        {"year": 2020, "month": 11, "value": 180.0}, # Post-Monsoon
    ]
    seasons = compute_seasonal_breakdown(records, unit="µg/m³")
    assert len(seasons) == 4

    season_map = {s.season_name: s for s in seasons}
    assert season_map["Winter"].valid_observations == 2
    assert season_map["Winter"].mean_concentration == 140.0
    assert season_map["Pre-Monsoon"].mean_concentration == 70.0
    assert season_map["Monsoon"].mean_concentration == 30.0
    assert season_map["Post-Monsoon"].mean_concentration == 180.0


def test_monthly_climatology_computation():
    """Validates 12-month multi-year historical baseline."""
    # 2 years of Jan & Jul
    records = [
        {"year": 2020, "month": 1, "value": 140.0},
        {"year": 2021, "month": 1, "value": 160.0},
        {"year": 2020, "month": 7, "value": 40.0},
        {"year": 2021, "month": 7, "value": 50.0},
    ]
    climatology = compute_monthly_climatology(records, unit="µg/m³")
    assert len(climatology) == 12

    jan_clim = climatology[0]
    assert jan_clim.month == 1
    assert jan_clim.historical_mean == 150.0
    assert jan_clim.years_represented == 2

    jul_clim = climatology[6]
    assert jul_clim.month == 7
    assert jul_clim.historical_mean == 45.0


def test_anomaly_detection_z_score():
    """Verifies standardized anomaly detection and emergency distinction guard."""
    records = [{"year": 2020, "month": 1, "value": 100.0}, {"year": 2021, "month": 1, "value": 100.0}]
    climatology = compute_monthly_climatology(records, unit="µg/m³")
    
    # Target reading is 140.0, baseline mean is 100.0
    target_records = [{"year": 2022, "month": 1, "value": 140.0}]
    anomalies = detect_anomalies(target_records, climatology, unit="µg/m³", recent_count=1)

    assert len(anomalies) == 1
    anom = anomalies[0]
    assert anom.target_period == "2022-01"
    assert anom.baseline_mean == 100.0
    assert anom.deviation == 40.0
    assert "not an immediate health emergency" in anom.note


# ==============================================================================
# 3. Forecasting Engine Tests (Leakage Prevention & Chronological Evaluation)
# ==============================================================================

def test_forecasting_chronological_split_and_metrics():
    """Tests chronological train (2017–2021) / test (2022) evaluation."""
    # Construct 72 synthetic monthly points with strong annual cycle
    series = []
    for y in range(2017, 2023):
        for m in range(1, 13):
            # High in winter (Jan/Dec), low in monsoon (Jul)
            base = 150.0 if m in (12, 1, 2) else (40.0 if m in (6, 7, 8) else 90.0)
            series.append({"year": y, "month": m, "value": base + (y - 2017) * 2.0})

    s_eval, c_eval, best = evaluate_forecast_models(series, unit="µg/m³")

    assert s_eval.train_period_range == "2017-01 to 2021-12"
    assert s_eval.test_period_range == "2022-01 to 2022-12"
    assert s_eval.train_observations == 60
    assert s_eval.test_observations == 12
    assert s_eval.mae >= 0.0
    assert s_eval.rmse >= 0.0
    assert c_eval.test_observations == 12
    assert best in (s_eval.model_name, c_eval.model_name)


def test_forecast_trajectory_horizon_and_uncertainty():
    """Verifies forecast generation across horizon and non-negative lower bound."""
    series = []
    for y in range(2017, 2023):
        for m in range(1, 13):
            series.append({"year": y, "month": m, "value": 80.0})

    resp = generate_forecast_trajectory(series, horizon_months=6, pollutant="PM2.5", unit="µg/m³")

    assert resp.horizon_months == 6
    assert len(resp.forecast_points) == 6
    assert resp.forecast_resolution == "monthly_mean"
    assert resp.data_kind == "forecast"

    # Verify first step ahead is 2023-01
    assert resp.forecast_points[0].period == "2023-01"
    assert resp.forecast_points[0].step_ahead == 1

    # Verify uncertainty interval validity
    for pt in resp.forecast_points:
        assert pt.lower_bound >= 0.0  # Cannot be negative concentration
        assert pt.upper_bound >= pt.forecast_value
        assert pt.lower_bound <= pt.forecast_value


def test_forecast_invalid_horizon_rejection():
    """Rejects out-of-range horizon (< 1 or > 12)."""
    series = [{"year": 2020, "month": m, "value": 50.0} for m in range(1, 13)]
    with pytest.raises(ValueError, match="Forecast horizon must be between 1 and 12"):
        generate_forecast_trajectory(series, horizon_months=0)

    with pytest.raises(ValueError, match="Forecast horizon must be between 1 and 12"):
        generate_forecast_trajectory(series, horizon_months=13)


def test_forecast_cpcb_ground_rejection():
    """Strictly guards against attempting time-series forecasting on single CPCB snapshot."""
    with pytest.raises(ValueError, match="single statutory snapshot"):
        environmental_forecasting_service.forecast_ground_stations()


# ==============================================================================
# 4. Health Risk & Public Advisory Engine Tests (Averaging Period Safety)
# ==============================================================================

def test_health_risk_compatible_24_hour_mean():
    """A genuine 24-hour mean can be evaluated against the statutory NAAQS threshold."""
    # Under standard (60 µg/m³ for PM2.5)
    adv_good = health_risk_advisory_service.evaluate_risk(
        "PM2.5", 25.0, averaging_period="24_hour_mean", is_instantaneous_snapshot=False
    )
    assert adv_good.cpcb_category == "Good"
    assert adv_good.risk_level == "low"
    assert adv_good.exceedance_status == "within_standard"
    assert adv_good.confidence_level == "not_estimated"

    # Exceeding 24-hr standard
    adv_mod = health_risk_advisory_service.evaluate_risk(
        "PM2.5", 85.0, averaging_period="24_hour_mean", is_instantaneous_snapshot=False
    )
    assert adv_mod.cpcb_category == "Moderate"
    assert adv_mod.risk_level == "elevated"
    assert adv_mod.exceedance_status == "exceeds_standard"


def test_health_risk_instantaneous_snapshot_rejected_for_24_hour_standard():
    """An instantaneous snapshot cannot be treated as a confirmed 24-hour statutory exceedance."""
    adv = health_risk_advisory_service.evaluate_risk(
        "PM2.5", 105.0, averaging_period="24_hour_mean", is_instantaneous_snapshot=True
    )
    assert adv.exceedance_status == "unverified_averaging_period"
    assert adv.risk_level == "insufficient_data"
    assert "Unverified Period (Snapshot Data)" in adv.cpcb_category
    assert any("Snapshot reading cannot confirm a 24-hour standard exceedance" in l for l in adv.limitations)


def test_health_risk_monthly_mean_not_misrepresented_as_24h_exceedance():
    """A monthly modelled estimate is not misrepresented as a 24-hour statutory exceedance."""
    adv = health_risk_advisory_service.evaluate_risk(
        "PM2.5", 95.0, averaging_period="monthly_mean", measurement_basis="modelled_gridded"
    )
    assert adv.averaging_period == "monthly_mean"
    assert adv.exceedance_status == "unverified_averaging_period"
    assert adv.cpcb_category == "Modelled Monthly Mean"
    assert any("does not define a statutory monthly standard" in l for l in adv.limitations)


def test_health_risk_1_hour_snapshot_without_statutory_standard():
    """Single timestamp for PM2.5 cannot be treated as verified 1-hour average as no standard exists."""
    adv = health_risk_advisory_service.evaluate_risk(
        "PM2.5", 105.0, averaging_period="1_hour_snapshot"
    )
    assert adv.exceedance_status == "unverified_averaging_period"
    assert adv.cpcb_category == "Instantaneous Snapshot"
    assert adv.risk_level == "insufficient_data"
    assert any("does not define a 1-hour statutory threshold" in l for l in adv.limitations)


def test_health_risk_1_hour_snapshot_with_statutory_standard():
    """Pollutants with statutory 1-hr standards (e.g. CO) can be evaluated."""
    adv_co = health_risk_advisory_service.evaluate_risk(
        "CO", 2.0, averaging_period="1_hour_snapshot"
    )
    assert adv_co.exceedance_status == "within_standard"

    adv_co_high = health_risk_advisory_service.evaluate_risk(
        "CO", 6.0, averaging_period="1_hour_snapshot"
    )
    assert adv_co_high.exceedance_status == "exceeds_standard"


def test_health_risk_confidence_never_hardcoded_high():
    """Deterministic rule-based threshold evaluation returns not_estimated confidence."""
    adv = health_risk_advisory_service.evaluate_risk("PM2.5", 105.0)
    assert adv.confidence_level == "not_estimated"
    assert adv.confidence_level != "high"


def test_health_risk_null_observation_handling():
    """Handles null/missing telemetry with insufficient_data risk level and preserves null."""
    adv = health_risk_advisory_service.evaluate_risk("PM2.5", None)
    assert adv.risk_level == "insufficient_data"
    assert adv.cpcb_category == "No Data"
    assert adv.exceedance_status == "insufficient_data"
    assert adv.concentration is None


def test_health_risk_non_clinical_disclaimer():
    """Ensures regulatory advisory includes population-level disclaimer."""
    adv = health_risk_advisory_service.evaluate_risk("PM2.5", 110.0)
    assert "do not constitute individual medical diagnoses" in adv.disclaimer
    assert len(adv.sensitive_groups_guidance) >= 2


# ==============================================================================
# 5. FastAPI Endpoints Integration Tests
# ==============================================================================

def test_api_environmental_ai_analysis_gridded(client):
    """Tests GET /api/v1/environmental/ai/analysis with gridded historical data."""
    res = client.get("/api/v1/environmental/ai/analysis?dataset_type=gridded_historical&pollutant=PM2.5")
    assert res.status_code == 200
    data = res.json()

    assert data["dataset_id"] == "zeonodo-data2"
    assert data["pollutant"] == "PM2.5"
    assert data["data_kind"] == "modelled"
    assert data["stats"]["valid_count"] == 72
    assert len(data["climatology"]) == 12
    assert len(data["seasonal_trends"]) == 4
    assert len(data["recent_anomalies"]) > 0


def test_api_environmental_ai_analysis_ground(client):
    """Tests GET /api/v1/environmental/ai/analysis with CPCB ground snapshot."""
    res = client.get("/api/v1/environmental/ai/analysis?dataset_type=ground_snapshot&pollutant=PM2.5&corridor_only=true")
    assert res.status_code == 200
    data = res.json()

    assert data["dataset_id"] == "cpcb_snapshot_2026"
    assert data["pollutant"] == "PM2.5"
    assert data["data_kind"] == "measured"
    assert data["stats"]["valid_count"] > 0
    # Single snapshot does not have seasonal climatology
    assert len(data["climatology"]) == 0
    assert any("Single statutory snapshot" in l for l in data["limitations"])


def test_api_environmental_ai_forecast(client):
    """Tests GET /api/v1/environmental/ai/forecast."""
    res = client.get("/api/v1/environmental/ai/forecast?pollutant=PM2.5&horizon_months=6")
    assert res.status_code == 200
    data = res.json()

    assert data["pollutant"] == "PM2.5"
    assert data["horizon_months"] == 6
    assert data["data_kind"] == "forecast"
    assert len(data["forecast_points"]) == 6
    assert data["evaluation"]["test_observations"] == 12
    assert data["evaluation"]["mae"] > 0.0
    assert data["evaluation"]["rmse"] > 0.0


def test_api_environmental_ai_advisory_dynamic_three_periods(client):
    """Tests GET /api/v1/environmental/ai/advisory across all 3 periods without hardcoding."""
    # 1. 24-Hour standard query (uses ground snapshot -> unverified)
    r24 = client.get("/api/v1/environmental/ai/advisory?pollutant=PM2.5&averaging_period=24_hour_mean")
    assert r24.status_code == 200
    d24 = r24.json()
    assert d24["averaging_period"] == "24_hour_mean"
    assert d24["exceedance_status"] == "unverified_averaging_period"
    assert d24["risk_level"] == "insufficient_data"
    assert d24["data_basis"] == "observed_ground"
    assert d24["confidence_level"] == "not_estimated"
    c24 = d24["concentration"]
    assert c24 is not None

    # 2. Monthly mean query (uses gridded modelled estimate -> distinct concentration and timestamp)
    rm = client.get("/api/v1/environmental/ai/advisory?pollutant=PM2.5&averaging_period=monthly_mean")
    assert rm.status_code == 200
    dm = rm.json()
    assert dm["averaging_period"] == "monthly_mean"
    assert dm["data_basis"] == "modelled_gridded"
    assert dm["cpcb_category"] == "Modelled Monthly Mean"
    assert dm["exceedance_status"] == "unverified_averaging_period"
    assert dm["confidence_level"] == "not_estimated"
    cm = dm["concentration"]
    assert cm is not None
    # Monthly modelled concentration is distinct from ground snapshot
    assert cm != c24

    # 3. 1-Hour snapshot query
    r1h = client.get("/api/v1/environmental/ai/advisory?pollutant=PM2.5&averaging_period=1_hour_snapshot")
    assert r1h.status_code == 200
    d1h = r1h.json()
    assert d1h["averaging_period"] == "1_hour_snapshot"
    assert d1h["exceedance_status"] == "unverified_averaging_period"
    assert d1h["confidence_level"] == "not_estimated"
