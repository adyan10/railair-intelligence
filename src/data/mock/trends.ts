import type { TrendDataPoint, DataQualityItem } from '../../types/railair';

// Simulated 24-hour trend for the corridor average
export const TREND_DATA: TrendDataPoint[] = [
  { time: '00:00', pm25: 118, pm10: 204 },
  { time: '02:00', pm25: 102, pm10: 185 },
  { time: '04:00', pm25: 96, pm10: 172 },
  { time: '06:00', pm25: 122, pm10: 218 },
  { time: '08:00', pm25: 158, pm10: 267 },
  { time: '10:00', pm25: 143, pm10: 251 },
  { time: '12:00', pm25: 135, pm10: 238 },
  { time: '14:00', pm25: 128, pm10: 229 },
  { time: '16:00', pm25: 141, pm10: 246 },
  { time: '18:00', pm25: 163, pm10: 281 },
  { time: '20:00', pm25: 171, pm10: 294 },
  { time: '22:00', pm25: 145, pm10: 253 },
];

export const DATA_QUALITY_ITEMS: DataQualityItem[] = [
  {
    source: 'Simulation Engine v0.1',
    lastUpdated: '2024-10-24T07:00:00Z',
    kind: 'simulated',
    confidence: 'low',
    coveragePercent: 100,
  },
  {
    source: 'CPCB Reference (Illustrative)',
    lastUpdated: '2024-10-20T00:00:00Z',
    kind: 'measured',
    confidence: 'medium',
    coveragePercent: 28,
  },
  {
    source: 'Dispersion Model (Illustrative)',
    lastUpdated: '2024-10-22T12:00:00Z',
    kind: 'modelled',
    confidence: 'very-low',
    coveragePercent: 62,
  },
];
