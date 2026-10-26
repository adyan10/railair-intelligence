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
- Never hardcodes 'HIGH' confidence for deterministic threshold checks; uses 'not_estimated'.
- Single snapshot observations cannot be reported as verified 24-hour NAAQS exceedances.
- Monthly modelled gridded estimates cannot be evaluated as 24-hour statutory exceedances.
- Handles missing/null observations cleanly with 'insufficient_data' status.
"""
from typing import Dict, Any, Optional, List, Literal
from ..models.ai_schemas import (
    HealthRiskAdvisoryResponse,
    SensitiveGroupGuidance,
    RiskCategory,
)

# Statutory CPCB NAAQS 2009 Standards
# Format: {pollutant: {"24_hour_mean": standard, "annual_mean": standard, "1_hour_mean": standard, "unit": unit}}
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
    "Unverified": {
        "general": "Observation averaging period does not match the statutory CPCB compliance basis. Exercise standard environmental awareness based on ambient conditions.",
        "sensitive": [
            SensitiveGroupGuidance(group_name="Children and Older Adults", precaution="Maintain caution during heavy exertion if air appears visibly hazy."),
            SensitiveGroupGuidance(group_name="Cardiovascular & Respiratory Conditions", precaution="Keep routine respiratory medication accessible."),
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
        is_instantaneous_snapshot: bool = False,
        measurement_basis: Optional[str] = None,
    ) -> HealthRiskAdvisoryResponse:
        """Evaluates health risk for a specific pollutant concentration deterministically.

        Enforces strict averaging-period compatibility and never reports unverified exceedances.
        Confidence is explicitly represented as 'not_estimated' for deterministic checks.
        """
        if measurement_basis is not None and measurement_basis in ("observed_ground", "modelled_gridded", "statistical_forecast"):
            data_basis = measurement_basis  # type: ignore
        p_clean = pollutant.strip().upper()
        unit = "mg/m³" if p_clean == "CO" else "µg/m³"

        # 1. Handle missing or null observations
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
                confidence_level="not_estimated",
                limitations=["Telemetry measurement is null or unavailable from data provider."],
            )

        val = float(concentration)
        limitations: List[str] = [
            "Deterministic threshold evaluation is an exact rule-based classification; statistical confidence intervals are not estimated for single deterministic readings."
        ]

        naaqs_info = CPCB_NAAQS_STANDARDS.get(p_clean, {})
        applicable_standard: Optional[float] = None
        exceedance_status: Literal["within_standard", "exceeds_standard", "unverified_averaging_period", "insufficient_data"] = "unverified_averaging_period"
        category = "Unverified Period"
        risk_level: RiskCategory = "insufficient_data"
        color = "#64748B"

        # 2. Case A: 24-Hour Mean Selection
        if averaging_period == "24_hour_mean":
            std_24h = naaqs_info.get("24_hour_mean")
            applicable_standard = std_24h

            # Rule: If data represents an instantaneous snapshot, it CANNOT establish 24-hr statutory compliance
            if is_instantaneous_snapshot:
                category = "Unverified Period (Snapshot Data)"
                risk_level = "insufficient_data"
                color = "#64748B"
                exceedance_status = "unverified_averaging_period"
                limitations.append(
                    f"Underlying telemetry is a single instantaneous snapshot ({data_timestamp}). "
                    f"Statutory 24-hour NAAQS compliance requires continuous 24-hour sampling (minimum 16 hours valid data). "
                    f"Snapshot reading cannot confirm a 24-hour standard exceedance."
                )
                general_adv = (
                    "Instantaneous snapshot cannot confirm statutory 24-hour compliance under CPCB guidelines. "
                    "Precautionary guidance: if localized conditions appear hazy, sensitive individuals should pace strenuous exertion."
                )
            else:
                # Genuinely compatible 24-hour mean provided
                if std_24h is not None:
                    if val > std_24h:
                        exceedance_status = "exceeds_standard"
                    else:
                        exceedance_status = "within_standard"

                # Classify using CPCB 24-hr AQI breakpoints
                breakpoints = CPCB_AQI_BREAKPOINTS.get(p_clean, [])
                for cutoff, cat_name, r_cat, col in breakpoints:
                    if val <= cutoff:
                        category = cat_name
                        risk_level = r_cat
                        color = col
                        break
                general_adv = ADVISORY_GUIDANCE_BY_CATEGORY.get(category, {}).get("general", "")

        # 3. Case B: Monthly Mean Selection
        elif averaging_period == "monthly_mean":
            # Rule: CPCB NAAQS defines NO statutory monthly standard. Gridded data is 30-day modelled estimate.
            exceedance_status = "unverified_averaging_period"
            applicable_standard = None
            category = "Modelled Monthly Mean"
            risk_level = "moderate" if val <= 90.0 else ("elevated" if val <= 150.0 else "high")
            color = "#0284C7" if val <= 90.0 else ("#EAB308" if val <= 150.0 else "#F97316")

            limitations.append(
                "CPCB NAAQS (2009) does not define a statutory monthly standard. "
                "Monthly gridded estimates represent sub-chronic regional ambient averages from satellite/CTM models (2017–2022), "
                "not statutory 24-hour ground regulatory measurements."
            )
            general_adv = (
                "Monthly mean represents sub-chronic regional ambient exposure derived from gridded models (2017–2022). "
                "It demonstrates broad seasonal trends rather than immediate daily regulatory exceedances."
            )

        # 4. Case C: 1-Hour Snapshot Selection
        elif averaging_period == "1_hour_snapshot":
            std_1h = naaqs_info.get("1_hour_mean")
            if std_1h is not None:
                # Statutory 1-hr standard exists (CO: 4.0 mg/m³, OZONE: 180 µg/m³)
                applicable_standard = std_1h
                if val > std_1h:
                    exceedance_status = "exceeds_standard"
                    category = "Exceeds 1-Hr Standard"
                    risk_level = "high"
                    color = "#EF4444"
                else:
                    exceedance_status = "within_standard"
                    category = "Within 1-Hr Standard"
                    risk_level = "low"
                    color = "#10B981"
                general_adv = f"1-hour snapshot evaluated against statutory CPCB 1-hour standard ({std_1h} {unit})."
            else:
                # No 1-hr standard in NAAQS for PM2.5, PM10, NO2, SO2, NH3
                applicable_standard = None
                exceedance_status = "unverified_averaging_period"
                category = "Instantaneous Snapshot"
                risk_level = "insufficient_data"
                color = "#64748B"
                limitations.append(
                    f"CPCB NAAQS (2009) does not define a 1-hour statutory threshold for {p_clean}. "
                    "Instantaneous sensor telemetry reflects real-time presence at the observation timestamp only."
                )
                general_adv = (
                    f"Real-time CAAQMS sensor reading reflects instantaneous localized air quality. "
                    f"CPCB NAAQS defines no 1-hour threshold for {p_clean}; snapshot is interpreted for immediate ambient awareness."
                )
        else:
            exceedance_status = "unverified_averaging_period"
            category = "Unverified Period"
            risk_level = "insufficient_data"
            general_adv = "Unsupported averaging period."

        # Add data provenance and timestamp limitation notes
        if data_basis == "statistical_forecast":
            limitations.append("Assessment is derived from statistical forecasts with empirical uncertainty.")
        elif data_basis == "modelled_gridded":
            limitations.append("Assessment is derived from 10 km gridded satellite/chemical transport model estimates.")
        else:
            limitations.append(f"Observation timestamp: {data_timestamp} (Statutory snapshot).")

        guidance_sensitive = ADVISORY_GUIDANCE_BY_CATEGORY.get(
            category,
            ADVISORY_GUIDANCE_BY_CATEGORY["Unverified"]
        ).get("sensitive", ADVISORY_GUIDANCE_BY_CATEGORY["Unverified"]["sensitive"])

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
            general_public_advisory=general_adv,
            sensitive_groups_guidance=guidance_sensitive,
            data_timestamp=data_timestamp,
            confidence_level="not_estimated",
            limitations=limitations,
        )


health_risk_advisory_service = HealthRiskAdvisoryService()
