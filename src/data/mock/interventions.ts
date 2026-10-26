import type { InterventionScenario } from '../../types/railair';

export const BASELINE_METRICS = {
  avgPm25: 135,
  avgPm10: 233,
  hotspotCount: 3,
  coveragePercent: 28,
};

export const BASELINE_SCENARIO: InterventionScenario = {
  id: 'baseline',
  label: 'Baseline (No Intervention)',
  description: 'Current simulated corridor conditions with no improvements applied.',
  assumptions: {
    locomotiveFuelReductionPct: 0,
    stationVentilationImprovementPct: 0,
    vegetationBarrierCoverPct: 0,
    lowEmissionZoneAdoptionPct: 0,
  },
  isBaseline: true,
};

export const INTERVENTION_SCENARIOS: InterventionScenario[] = [
  BASELINE_SCENARIO,
  {
    id: 'scenario-a',
    label: 'Scenario A: Station Ventilation',
    description: 'Hypothetical improvement to station ventilation infrastructure.',
    assumptions: {
      locomotiveFuelReductionPct: 0,
      stationVentilationImprovementPct: 30,
      vegetationBarrierCoverPct: 0,
      lowEmissionZoneAdoptionPct: 0,
    },
    isBaseline: false,
  },
  {
    id: 'scenario-b',
    label: 'Scenario B: Multi-Intervention',
    description: 'Combined hypothetical improvements across multiple intervention types.',
    assumptions: {
      locomotiveFuelReductionPct: 15,
      stationVentilationImprovementPct: 25,
      vegetationBarrierCoverPct: 20,
      lowEmissionZoneAdoptionPct: 10,
    },
    isBaseline: false,
  },
];

export const ASSUMPTION_LABELS: Record<string, string> = {
  locomotiveFuelReductionPct: 'Locomotive Fuel Efficiency Gain (%)',
  stationVentilationImprovementPct: 'Station Ventilation Improvement (%)',
  vegetationBarrierCoverPct: 'Green Barrier Coverage (%)',
  lowEmissionZoneAdoptionPct: 'Low-Emission Zone Adoption (%)',
};

export const ASSUMPTION_DESCRIPTIONS: Record<string, string> = {
  locomotiveFuelReductionPct: 'Hypothetical reduction in diesel consumption per km. Effect on ambient PM is uncertain and not validated.',
  stationVentilationImprovementPct: 'Hypothetical improvement in enclosed station air exchange. Direct PM reduction is speculative.',
  vegetationBarrierCoverPct: 'Hypothetical green infrastructure along corridor. Effectiveness varies widely.',
  lowEmissionZoneAdoptionPct: 'Hypothetical adoption of restricted vehicle zones near stations.',
};
