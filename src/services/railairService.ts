// ============================================================
// RailAir Intelligence ? Service Interface
// ============================================================
import type {
  Station, CorridorSegment, Hotspot, JourneyEstimate,
  KpiSummary, TrendDataPoint, DataQualityItem, InterventionScenario, ScenarioResult,
} from '../types/railair';

export interface RailAirService {
  getStations(): Promise<Station[]>;
  getCorridorSegments(): Promise<CorridorSegment[]>;
  getKpiSummary(): Promise<KpiSummary>;
  getTrend(): Promise<TrendDataPoint[]>;
  getDataQuality(): Promise<DataQualityItem[]>;
  getHotspots(): Promise<Hotspot[]>;
  getJourneyEstimate(
    originId: string,
    destinationId: string,
    durationMinutes: number,
    label: string
  ): Promise<JourneyEstimate>;
  getInterventionScenarios(): Promise<InterventionScenario[]>;
  calcScenario(scenarioId: string, overrides?: Record<string, number>): Promise<ScenarioResult>;
}
