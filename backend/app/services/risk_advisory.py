"""RailAir Intelligence — Deterministic Health-Risk and Public Advisory Engine.

Translates verified environmental concentrations (ground measurements, gridded estimates,
or validated statistical forecasts) into evidence-based public health guidance.

Authoritative Standards Referenced:
1. Central Pollution Control Board (CPCB) National Ambient Air Quality Standards (NAAQS 2009, Notification G.S.R. 826(E)).
2. Ministry of Environment, Forest and Climate Change (MoEFCC) National AQI Guidelines (2014/2015).

Strict Safeguards:
- No clinical diagnostics or individual prognosis (population-level guidance only).
- Strict separation between averaging periods (24-hour vs monthly mean vs 1-hour snapshot).
- Never conflates raw physical pollutant concentrations (µg/m³, mg/m³) with unitless AQI indices.
- Handles missing/null observations cleanly with 'insufficient_data' status.
"""
from typing import Dict, Any, Optional, List, Literal
from ..models.ai_schemas import (
    HealthRiskAdvisoryResponse,
    SensitiveGroupGuidance,
    RiskCategory,
)

# Statutory CPCB NAAQS 2009 Standards
# Format: {pollutant: {"24_hour_mean": standard, "annual_mean": standard, "unit": unit}}
CPCB_NAAQS_STANDARDS: Dict[str, Dict[str, Any]] = {
    "PM2.5": {"24_hour_mean": 60.0, "annual_mean": 40.0, "unit": "µg/m³"},
    "PM10": {"24_hour_mean": 100.0, "annual_mean": 60.0, "unit": "µg/m³"},
    "NO2": {"24_hour_mean": 80.0, "annual_mean": 40.0, "unit": "µg/m³"},
    "SO2": {"24_hour_mean": 80.0, "annual_mean": 50.0, "unit": "µg/m³"},
    "CO": {"8_hour_mean": 2.0, "1_hour_mean": 4.0, "unit": "mg/m³"},
    "OZONE": {"8_hour_mean": 100.0, "1_hour_mean": 180.0, "unit": "µg/m³"},
    "NH3": {"24_hour_mean": 400.0, "annual_mean": 100.0, "unit": "µg/m³"},
}

# CPCB Sub-Index Concentration Breakpoints for 24-hr averaging periods
# (Values represent upper bounds of category ranges)
CPCB_AQI_BREAKPOINTS = {
    "PM2.5": [
        (30.0, "Good", "low", "#10B981"),
        (60.0, "Satisfactory", "moderate", "#84CC16"),
        (90.0, "Moderate", "elevated", "#EAB308"),
        (120.0, "Poor", "high", "#F97316"),
        (250.0, "Very Poor", "critical", "#EF4444"),
        (float("inf"), "Severe", "critical", "#7F1D1D"),
    ],
    "PM10": [
        (50.0, "Good", "low", "#10B981"),
        (100.0, "Satisfactory", "moderate", "#84CC16"),
        (250.0, "Moderate", "elevated", "#EAB308"),
        (350.0, "Poor", "high", "#F97316"),
        (430.0, "Very Poor", "critical", "#EF4444"),
        (float("inf"), "Severe", "critical", "#7F1D1D"),
    ],
    "NO2": [
        (40.0, "Good", "low", "#10B981"),
        (80.0, "Satisfactory", "moderate", "#84CC16"),
        (180.0, "Moderate", "elevated", "#EAB308"),
        (280.0, "Poor", "high", "#F97316"),
        (400.0, "Very Poor", "critical", "#EF4444"),
        (float("inf"), "Severe", "critical", "#7F1D1D"),
    ],
    "CO": [
        (1.0, "Good", "low", "#10B981"),
        (2.0, "Satisfactory", "moderate", "#84CC16"),
        (10.0, "Moderate", "elevated", "#EAB308"),
        (17.0, "Poor", "high", "#F97316"),
        (34.0, "Very Poor", "critical", "#EF4444"),
        (float("inf"), "Severe", "critical", "#7F1D1D"),
    ],
}

ADVISORY_GUIDANCE_BY_CATEGORY = {
    "Good": {
        "general": "Air quality is favorable. Outdoor exercise and routine commuting carry minimal environmental risk.",
        "sensitive": [
            SensitiveGroupGuidance(group_name="Children and Older Adults", precaution="No special precautions needed; standard outdoor activities welcome."),
            SensitiveGroupGuidance(group_name="Cardiovascular & Respiratory Conditions", precaution="Normal activity permitted; maintain prescribed routine maintenance medication."),
        ],
    },
    "Satisfactory": {
        "general": "Air quality is acceptable. Minor discomfort may be experienced by unusually sensitive individuals during strenuous outdoor exertion.",
        "sensitive": [
            SensitiveGroupGuidance(group_name="Children and Older Adults", precaution="Normal outdoor activity; observe for mild symptoms during prolonged exertion."),
            SensitiveGroupGuidance(group_name="Cardiovascular & Respiratory Conditions", precaution="Keep quick-relief inhalers accessible during extended outdoor travel."),
        ],
    },
    "Moderate": {
        "general": "Elevated particulate/gaseous presence. Healthy individuals should consider pacing intense aerobic outdoor exertion.",
        "sensitive": [
            SensitiveGroupGuidance(group_name="Children and Older Adults", precaution="Reduce prolonged or heavy outdoor exertion, especially in early morning and late evening."),
            SensitiveGroupGuidance(group_name="Cardiovascular & Respiratory Conditions", precaution="Persons with asthma, COPD, or coronary disease should limit prolonged outdoor exposure along high-traffic corridors."),
        ],
    },
    "Poor": {
        "general": "Unhealthy air conditions. Most people may experience breathing discomfort or throat irritation during prolonged exposure. Avoid strenuous outdoor running or cycling along major freight corridors.",
        "sensitive": [
            SensitiveGroupGuidance(group_name="Children and Older Adults", precaution="Avoid prolonged outdoor playtime and heavy outdoor exercise. Prefer filtered indoor environments."),
            SensitiveGroupGuidance(group_name="Cardiovascular & Respiratory Conditions", precaution="Wear high-filtration respirators (N95/FFP2) when transiting near transit junctions. Avoid non-essential outdoor travel."),
        ],
    },
    "Very Poor": {
        "general": "Significant environmental health hazard. Prolonged exposure causes respiratory illness in general population. Shift physical activities indoors and minimize non-essential travel.",
        "sensitive": [
            SensitiveGroupGuidance(group_name="Children and Older Adults", precaution="Remain indoors with doors/windows closed. Use air purification if available."),
            SensitiveGroupGuidance(group_name="Cardiovascular & Respiratory Conditions", precaution="Strictly avoid outdoor physical exertion. Seek clinical attention if experiencing tightness in chest, coughing, or shortness of breath."),
        ],
    },
    "Severe": {
        "general": "Critical air quality emergency. Severe health impact on healthy adults and serious aggravation of pre-existing cardiorespiratory conditions. Public transit hubs require air-filtration measures.",
        "sensitive": [
            SensitiveGroupGuidance(group_name="Children and Older Adults", precaution="Mandatory indoor stay. Schools and daycare should suspend all outdoor physical sessions."),
            SensitiveGroupGuidance(group_name="Cardiovascular & Respiratory Conditions", precaution="Immediate risk of exacerbation. Ensure access to supplemental oxygen/emergency care if advised by your physician."),
        ],
    },
}


class HealthRiskAdvisoryService:
    """Evaluates environmental health risks and provides evidence-based public advisories."""

    def evaluate_risk(
        self,
        pollutant: str,
        concentration: Optional[float],
        averaging_period: str = "24_hour_mean",
        data_basis: Literal["observed_ground", "modelled_gridded", "statistical_forecast"] = "observed_ground",
        data_timestamp: str = "2026-10-24T21:30:00Z",
        is_stale: bool = False,
    ) -> HealthRiskAdvisoryResponse:
        """Evaluates health risk for a specific pollutant concentration deterministically."""
        p_clean = pollutant.strip().upper()
        unit = "mg/m³" if p_clean == "CO" else "µg/m³"

        # Handle missing or null data
        if concentration is None:
            return HealthRiskAdvisoryResponse(
                pollutant=p_clean,
                concentration=None,
                unit=unit,
                averaging_period=averaging_period,
                data_basis=data_basis,
                cpcb_category="No Data",
                risk_level="insufficient_data",
                color="#94A3B8",
                applicable_naaqs_standard=None,
                exceedance_status="insufficient_data",
                general_public_advisory="Environmental reading is missing or uncalibrated. Risk cannot be evaluated reliably without valid observations.",
                sensitive_groups_guidance=[],
                data_timestamp=data_timestamp,
                confidence_level="unvalidated",
                limitations=["Telemetry measurement is null or unavailable from data provider."],
            )

        val = float(concentration)

        # Classify using CPCB category breakpoints
        breakpoints = CPCB_AQI_BREAKPOINTS.get(p_clean)
        category = "Moderate"
        risk_level: RiskCategory = "elevated"
        color = "#EAB308"

        if breakpoints:
            for cutoff, cat_name, risk_cat, col in breakpoints:
                if val <= cutoff:
                    category = cat_name
                    risk_level = risk_cat
                    color = col
                    break
        else:
            # Fallback for pollutants without explicit breakpoints (e.g. NH3)
            category = "Standard"
            risk_level = "moderate"
            color = "#64748B"

        # Evaluate regulatory standard threshold
        naaqs_info = CPCB_NAAQS_STANDARDS.get(p_clean, {})
        applicable_standard = naaqs_info.get(averaging_period)
        
        exceedance_status: Literal["within_standard", "exceeds_standard", "unverified_averaging_period", "insufficient_data"] = "unverified_averaging_period"
        limitations: List[str] = []

        if applicable_standard is not None:
            if val > applicable_standard:
                exceedance_status = "exceeds_standard"
            else:
                exceedance_status = "within_standard"
        else:
            # If averaging period doesn't match statutory NAAQS period
            # (e.g. monthly_mean or 1_hour_snapshot against 24-hr standard)
            std_24h = naaqs_info.get("24_hour_mean")
            applicable_standard = std_24h
            exceedance_status = "unverified_averaging_period"
            limitations.append(
                f"Averaging period '{averaging_period}' does not directly match the statutory CPCB 24-hour compliance baseline. "
                f"Reference threshold ({std_24h} {unit}) is provided for comparative exposure context only."
            )

        if data_basis == "statistical_forecast":
            limitations.append("Assessment is derived from statistical forecasts with empirical uncertainty, not real-time telemetry.")
            confidence = "medium"
        elif data_basis == "modelled_gridded":
            limitations.append("Assessment is derived from 10 km gridded satellite/chemical transport model estimates.")
            confidence = "medium"
        else:
            confidence = "high"

        if is_stale:
            limitations.append(
                f"Data timestamp ({data_timestamp}) is historical or statutory snapshot telemetry. "
                "Current immediate meteorological conditions may differ."
            )
            confidence = "low" if confidence == "medium" else "medium"

        guidance = ADVISORY_GUIDANCE_BY_CATEGORY.get(
            category,
            ADVISORY_GUIDANCE_BY_CATEGORY["Moderate"]
        )

        return HealthRiskAdvisoryResponse(
            pollutant=p_clean,
            concentration=val,
            unit=unit,
            averaging_period=averaging_period,
            data_basis=data_basis,
            cpcb_category=category,
            risk_level=risk_level,
            color=color,
            applicable_naaqs_standard=applicable_standard,
            exceedance_status=exceedance_status,
            general_public_advisory=guidance["general"],
            sensitive_groups_guidance=guidance["sensitive"],
            data_timestamp=data_timestamp,
            confidence_level=confidence,
            limitations=limitations,
        )


health_risk_advisory_service = HealthRiskAdvisoryService()
