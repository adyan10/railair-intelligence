"""FastAPI endpoints for RailAir Environmental Intelligence Engine.

Provides versioned, typed endpoints for:
1. /analysis: Descriptive statistics, seasonal trends, climatology, and standardized anomaly detection.
2. /forecast: Chronologically evaluated statistical forecasts with out-of-sample metrics & prediction intervals.
3. /advisory: Deterministic public health risk assessment aligned with CPCB statutory standards.
"""
from typing import Optional, Literal
from fastapi import APIRouter, Query, HTTPException, status

from ....models.ai_schemas import (
    EnvironmentalAnalysisResponse,
    ForecastResponse,
    HealthRiskAdvisoryResponse,
)
from ....services.environmental_analysis import environmental_analysis_service
from ....services.environmental_forecasting import environmental_forecasting_service
from ....services.risk_advisory import health_risk_advisory_service
from ....services.environmental_service import environmental_service

router = APIRouter()


@router.get(
    "/analysis",
    response_model=EnvironmentalAnalysisResponse,
    summary="Environmental Statistical Analysis & Anomaly Detection",
    description=(
        "Performs deterministic descriptive statistical analysis, seasonal breakdown, 12-month historical "
        "climatology, and standardized anomaly detection (z-score against month-of-year baseline). "
        "Supports longitudinal gridded NetCDF data (2017–2022) or statutory CPCB CAAQMS ground telemetry."
    ),
)
async def get_environmental_analysis(
    dataset_type: Literal["gridded_historical", "ground_snapshot"] = Query(
        "gridded_historical",
        description="Dataset source: 'gridded_historical' (2017–2022 NetCDF) or 'ground_snapshot' (CPCB statutory ground telemetry)",
    ),
    pollutant: str = Query(
        "PM2.5",
        description="Pollutant: PM2.5 | PM10 (for gridded) or PM2.5 | PM10 | NO2 | SO2 | CO | OZONE | NH3 (for ground)",
    ),
    grid_id: Optional[str] = Query(
        None,
        description="Specific grid cell (e.g. 'grid_28.67_77.44') for gridded analysis",
    ),
    corridor_only: bool = Query(
        True,
        description="Limits ground snapshot analysis to RRTS corridor monitoring stations",
    ),
) -> EnvironmentalAnalysisResponse:
    try:
        if dataset_type == "gridded_historical":
            return environmental_analysis_service.analyze_gridded_historical(
                pollutant=pollutant,
                grid_id=grid_id,
            )
        else:
            return environmental_analysis_service.analyze_ground_snapshot(
                pollutant=pollutant,
                corridor_only=corridor_only,
            )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Environmental analysis failed: {str(exc)}",
        )


@router.get(
    "/forecast",
    response_model=ForecastResponse,
    summary="Chronologically Evaluated Statistical Forecast",
    description=(
        "Generates monthly statistical forecasts for PM2.5 or PM10 across a specified horizon (1 to 12 months) "
        "using 72 months of validated historical gridded data (2017–2022). Employs strict chronological train/test "
        "evaluation (Train: 2017–2021, Held-out Test: 2022) reporting true out-of-sample MAE and RMSE with ~95% prediction intervals. "
        "The single-timestamp CPCB ground snapshot is explicitly rejected for temporal forecasting."
    ),
)
async def get_environmental_forecast(
    pollutant: Literal["PM2.5", "PM10"] = Query(
        "PM2.5",
        description="Pollutant for time-series forecasting: PM2.5 or PM10",
    ),
    grid_id: Optional[str] = Query(
        None,
        description="Target corridor grid cell (defaults to central corridor cell 'grid_28.67_77.44')",
    ),
    horizon_months: int = Query(
        6,
        ge=1,
        le=12,
        description="Forecast horizon in months (1 to 12)",
    ),
) -> ForecastResponse:
    try:
        return environmental_forecasting_service.forecast_gridded(
            pollutant=pollutant,
            grid_id=grid_id,
            horizon_months=horizon_months,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Forecasting generation failed: {str(exc)}",
        )


@router.get(
    "/advisory",
    response_model=HealthRiskAdvisoryResponse,
    summary="Deterministic Health Risk Assessment & Public Advisory",
    description=(
        "Evaluates evidence-based public health risk and issues proportionate advisories for general and sensitive populations "
        "aligned with CPCB NAAQS (2009) and National AQI guidelines. Distinguishes between statutory ground observations, "
        "modelled gridded estimates, and statistical forecasts."
    ),
)
async def get_health_risk_advisory(
    pollutant: str = Query(
        "PM2.5",
        description="Pollutant parameter: PM2.5 | PM10 | NO2 | SO2 | CO | OZONE | NH3",
    ),
    concentration: Optional[float] = Query(
        None,
        description="Pollutant concentration value. If omitted, uses latest corridor reading for this pollutant.",
    ),
    averaging_period: Literal["24_hour_mean", "monthly_mean", "1_hour_snapshot"] = Query(
        "24_hour_mean",
        description="Measurement averaging period: '24_hour_mean' (NAAQS compliance standard), 'monthly_mean', or '1_hour_snapshot'",
    ),
    data_basis: Literal["observed_ground", "modelled_gridded", "statistical_forecast"] = Query(
        "observed_ground",
        description="Source data classification",
    ),
) -> HealthRiskAdvisoryResponse:
    try:
        conc = concentration
        timestamp = "2026-10-24T21:30:00Z"

        # If concentration is not supplied, fetch the average reading for the corridor from CPCB snapshot
        if conc is None:
            stats = environmental_analysis_service.analyze_ground_snapshot(pollutant=pollutant, corridor_only=True)
            conc = stats.stats.mean
            timestamp = stats.freshness_timestamp

        return health_risk_advisory_service.evaluate_risk(
            pollutant=pollutant,
            concentration=conc,
            averaging_period=averaging_period,
            data_basis=data_basis,
            data_timestamp=timestamp,
            is_stale=True,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Risk evaluation failed: {str(exc)}",
        )
