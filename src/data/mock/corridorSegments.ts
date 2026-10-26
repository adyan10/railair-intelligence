import type { CorridorSegment } from '../../types/railair';

const SIM_PROVENANCE = {
  source: 'RailAir Intelligence Simulation Engine v0.1',
  timestamp: '2024-10-24T07:00:00Z',
  dataKind: 'simulated' as const,
  confidence: 'low' as const,
  confidenceScore: 0.20,
  notes: 'Corridor geometry is illustrative only and does not represent verified railway track geometry.',
};

// Illustrative corridor segments (NOT verified track data)
export const CORRIDOR_SEGMENTS: CorridorSegment[] = [
  {
    id: 'seg-MRT-MMU',
    fromStationId: 'MRT',
    toStationId: 'MMU',
    distanceKm: 22,
    travelTimeMinutes: 28,
    path: [
      { lat: 28.9845, lng: 77.7064 },
      { lat: 28.9100, lng: 77.6600 },
      { lat: 28.8324, lng: 77.5803 },
    ],
    pm25Estimate: 105,
    pm10Estimate: 185,
    provenance: SIM_PROVENANCE,
  },
  {
    id: 'seg-MMU-MNR',
    fromStationId: 'MMU',
    toStationId: 'MNR',
    distanceKm: 16,
    travelTimeMinutes: 20,
    path: [
      { lat: 28.8324, lng: 77.5803 },
      { lat: 28.8050, lng: 77.5450 },
      { lat: 28.7762, lng: 77.5096 },
    ],
    pm25Estimate: 113,
    pm10Estimate: 197,
    provenance: SIM_PROVENANCE,
  },
  {
    id: 'seg-MNR-GZB',
    fromStationId: 'MNR',
    toStationId: 'GZB',
    distanceKm: 18,
    travelTimeMinutes: 22,
    path: [
      { lat: 28.7762, lng: 77.5096 },
      { lat: 28.7200, lng: 77.4700 },
      { lat: 28.6595, lng: 77.4246 },
    ],
    pm25Estimate: 136,
    pm10Estimate: 234,
    provenance: SIM_PROVENANCE,
  },
  {
    id: 'seg-GZB-SAH',
    fromStationId: 'GZB',
    toStationId: 'SAH',
    distanceKm: 9,
    travelTimeMinutes: 12,
    path: [
      { lat: 28.6595, lng: 77.4246 },
      { lat: 28.6720, lng: 77.3930 },
      { lat: 28.6838, lng: 77.3613 },
    ],
    pm25Estimate: 141,
    pm10Estimate: 241,
    provenance: SIM_PROVENANCE,
  },
  {
    id: 'seg-SAH-DSO',
    fromStationId: 'SAH',
    toStationId: 'DSO',
    distanceKm: 7,
    travelTimeMinutes: 10,
    path: [
      { lat: 28.6838, lng: 77.3613 },
      { lat: 28.6784, lng: 77.3296 },
      { lat: 28.6730, lng: 77.2979 },
    ],
    pm25Estimate: 147,
    pm10Estimate: 251,
    provenance: SIM_PROVENANCE,
  },
  {
    id: 'seg-DSO-NDLS',
    fromStationId: 'DSO',
    toStationId: 'NDLS',
    distanceKm: 11,
    travelTimeMinutes: 16,
    path: [
      { lat: 28.6730, lng: 77.2979 },
      { lat: 28.6575, lng: 77.2587 },
      { lat: 28.6419, lng: 77.2194 },
    ],
    pm25Estimate: 162,
    pm10Estimate: 278,
    provenance: SIM_PROVENANCE,
  },
];
