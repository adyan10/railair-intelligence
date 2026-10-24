// ============================================================
// RailAir Intelligence ? Mock Service Implementation
// All data is simulated. No real APIs are called.
// ============================================================
import type { RailAirService } from './railairService';
import type { KpiSummary, ScenarioResult } from '../types/railair';
import { STATIONS, CORRIDOR_SEGMENTS, HOTSPOTS, TREND_DATA, DATA_QUALITY_ITEMS, INTERVENTION_SCENARIOS, BASELINE_SCENARIO } from '../data/mock';
import { buildJourneyEstimate } from '../lib/exposure';
import { calcScenarioResult } from '../lib/exposure';

const BASELINE_METRICS = {
  avgPm25: 135,
  avgPm10: 233,
  hotspotCount: HOTSPOTS.length,
  coveragePercent: 28,
};

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

  async getJourneyEstimate(originId, destinationId, durationMinutes, label) {
    const origin = STATIONS.find((s) => s.id === originId);
    const dest = STATIONS.find((s) => s.id === destinationId);
    if (!origin || !dest) throw new Error(`Unknown station(s): ${originId} / ${destinationId}`);
    const estimate = buildJourneyEstimate(
      `journey-${originId}-${destinationId}-${durationMinutes}`,
      label,
      origin,
      dest,
      CORRIDOR_SEGMENTS,
      STATIONS,
      durationMinutes
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
