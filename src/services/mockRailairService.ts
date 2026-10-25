// ============================================================
// RailAir Intelligence ? Mock Service Implementation
// All data is simulated. No real APIs are called.
// ============================================================
import type { RailAirService } from './railairService';
import type { KpiSummary, ScenarioResult, TrainServiceOption } from '../types/railair';
import { STATIONS, CORRIDOR_SEGMENTS, HOTSPOTS, TREND_DATA, DATA_QUALITY_ITEMS, INTERVENTION_SCENARIOS, BASELINE_SCENARIO, BASELINE_METRICS } from '../data/mock';
import { buildJourneyEstimate } from '../lib/exposure';
import { calcScenarioResult } from '../lib/exposure';
import { getEligibleTrains } from './timetableService';

const KPI: KpiSummary = {
  avgPm25: 135,
  avgPm10: 233,
  monitoredLocations: 2,
  totalLocations: STATIONS.length,
  coveragePercent: 28,
  dataConfidence: 'low',
  timestamp: '2024-10-24T07:00:00Z',
  dataKind: 'simulated',
};

// Simulate async latency
function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const mockRailairService: RailAirService = {
  getStations: () => delay(STATIONS),
  getCorridorSegments: () => delay(CORRIDOR_SEGMENTS),
  getKpiSummary: () => delay(KPI),
  getTrend: () => delay(TREND_DATA),
  getDataQuality: () => delay(DATA_QUALITY_ITEMS),
  getHotspots: () => delay(HOTSPOTS),

  async getTimetableOptions(originId: string, destinationId: string): Promise<TrainServiceOption[]> {
    const options = getEligibleTrains(originId, destinationId);
    return delay(options);
  },

  async getJourneyEstimate(originId, destinationId, durationOrTrain, label) {
    const origin = STATIONS.find((s) => s.id === originId);
    const dest = STATIONS.find((s) => s.id === destinationId);
    if (!origin || !dest) throw new Error(`Unknown station(s): ${originId} / ${destinationId}`);

    const eligibleTrains = getEligibleTrains(originId, destinationId);

    let selectedTrain: TrainServiceOption | undefined;
    let scheduledDuration = 0;
    let scheduleUnavailable = false;

    if (eligibleTrains.length > 0) {
      if (typeof durationOrTrain === 'string') {
        selectedTrain = eligibleTrains.find((t) => t.trainNo === durationOrTrain) ?? eligibleTrains[0];
      } else if (typeof durationOrTrain === 'number') {
        selectedTrain = eligibleTrains.find((t) => t.durationMinutes === durationOrTrain) ?? eligibleTrains[0];
      } else {
        selectedTrain = eligibleTrains[0];
      }
      scheduledDuration = selectedTrain.durationMinutes;
    } else {
      scheduleUnavailable = true;
      scheduledDuration = 0;
    }

    const estimateLabel = label ?? `${origin.shortName} → ${dest.shortName}`;
    const estimate = buildJourneyEstimate(
      `journey-${originId}-${destinationId}-${selectedTrain?.trainNo ?? 'none'}`,
      estimateLabel,
      origin,
      dest,
      CORRIDOR_SEGMENTS,
      STATIONS,
      scheduledDuration,
      selectedTrain,
      scheduleUnavailable
    );
    return delay(estimate);
  },

  async getInterventionScenarios() {
    return delay(INTERVENTION_SCENARIOS);
  },

  async calcScenario(scenarioId, overrides) {
    const scenario = INTERVENTION_SCENARIOS.find((s) => s.id === scenarioId) ?? BASELINE_SCENARIO;
    const assumptions = { ...scenario.assumptions, ...(overrides ?? {}) };
    const result = calcScenarioResult(assumptions, BASELINE_METRICS);
    const sr: ScenarioResult = {
      scenarioId,
      label: scenario.label,
      avgPm25: result.pm25,
      avgPm10: result.pm10,
      hotspotCount: Math.round(BASELINE_METRICS.hotspotCount * (1 - result.exposureReductionPct / 200)),
      coveragePercent: result.coveragePct,
      exposureProxyReduction: result.exposureReductionPct,
      isBaseline: scenario.isBaseline,
    };
    return delay(sr);
  },
};
