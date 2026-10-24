// ============================================================
// RailAir Intelligence ? Shared TypeScript Types
// All data kinds are: simulated | measured | modelled
// This MVP uses 'simulated' throughout.
// ============================================================

export type DataKind = 'simulated' | 'measured' | 'modelled';
export type Pollutant = 'PM2.5' | 'PM10' | 'NO2' | 'CO';
export type Severity = 'critical' | 'high' | 'moderate' | 'low';
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'very-low';

export interface DataProvenance {
  source: string;
  timestamp: string;          // ISO 8601
  dataKind: DataKind;
  confidence: ConfidenceLevel;
  confidenceScore: number;    // 0?1
  notes?: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Station {
  id: string;
  name: string;
  shortName: string;
  position: LatLng;
  type: 'junction' | 'terminal' | 'halt' | 'major';
  distanceFromOriginKm: number;
  observations: PollutionObservation[];
  provenance: DataProvenance;
}

export interface PollutionObservation {
  id: string;
  stationId: string;
  pollutant: Pollutant;
  value: number;
  unit: string;
  who_guideline?: number;
  naaqs_standard?: number;
  provenance: DataProvenance;
}

export interface CorridorSegment {
  id: string;
  fromStationId: string;
  toStationId: string;
  distanceKm: number;
  travelTimeMinutes: number;
  path: LatLng[];           // Illustrative geometry ? not verified track data
  pm25Estimate: number;
  pm10Estimate: number;
  provenance: DataProvenance;
}

export interface JourneySegmentEstimate {
  segmentId: string;
  fromStation: Station;
  toStation: Station;
  distanceKm: number;
  travelTimeMinutes: number;
  pm25Concentration: number;
  pm10Concentration: number;
  pm25ExposureProxy: number;  // ?g?h/m?
  pm10ExposureProxy: number;  // ?g?h/m?
}

export interface JourneyEstimate {
  id: string;
  label: string;
  originStationId: string;
  destinationStationId: string;
  totalDurationMinutes: number;
  segments: JourneySegmentEstimate[];
  totalPm25ExposureProxy: number;
  totalPm10ExposureProxy: number;
  calculationNote: string;
}

export interface Hotspot {
  id: string;
  stationId: string;
  stationName: string;
  position: LatLng;
  pollutant: Pollutant;
  estimatedConcentration: number;
  unit: string;
  severity: Severity;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  monitoringGap: boolean;
  rank: number;
  notes: string;
  provenance: DataProvenance;
}

export interface InterventionScenario {
  id: string;
  label: string;
  description: string;
  assumptions: Record<string, number>;
  isBaseline: boolean;
}

export interface ScenarioResult {
  scenarioId: string;
  label: string;
  avgPm25: number;
  avgPm10: number;
  hotspotCount: number;
  coveragePercent: number;
  exposureProxyReduction: number; // vs baseline, percent
  isBaseline: boolean;
}

export interface KpiSummary {
  avgPm25: number;
  avgPm10: number;
  monitoredLocations: number;
  totalLocations: number;
  coveragePercent: number;
  dataConfidence: ConfidenceLevel;
  timestamp: string;
  dataKind: DataKind;
}

export interface TrendDataPoint {
  time: string;
  pm25: number;
  pm10: number;
}

export interface DataQualityItem {
  source: string;
  lastUpdated: string;
  kind: DataKind;
  confidence: ConfidenceLevel;
  coveragePercent: number;
}

export type ActivePollutant = 'PM2.5' | 'PM10' | 'NAQI';

export interface CorridorContextType {
  selectedPollutant: ActivePollutant;
  setSelectedPollutant: (pol: ActivePollutant) => void;
  selectedHour: number;
  setSelectedHour: (hour: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  diurnalFactor: number;
}
