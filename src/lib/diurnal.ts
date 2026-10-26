// ============================================================
// RailAir Intelligence — Diurnal Atmospheric Modeling & CPCB Bands
// Pure, deterministic functions.
//
// DISCLAIMER: Diurnal curve factors and NAQI conversions are
// simulated illustrative approximations for interface prototyping.
// They do not represent live empirical feeds or certified dispersion models.
// ============================================================

import type { ActivePollutant } from '../types/railair';

/**
 * 24-hour diurnal scaling factors relative to reference hour 18:00 (factor = 1.00).
 * Captures diurnal pattern typical of Indo-Gangetic Plain:
 * - Nocturnal & evening thermal inversion peaks (20:00 - 03:00)
 * - Morning traffic peak (08:00)
 * - Afternoon solar convective dispersion trough (13:00 - 14:00)
 */
export const DIURNAL_FACTORS = [
  1.05, 1.08, 1.10, 1.10, 1.05, 0.98, // 00:00 - 05:00
  1.00, 1.05, 1.00, 0.90, 0.78, 0.70, // 06:00 - 11:00
  0.65, 0.62, 0.62, 0.66, 0.78, 0.92, // 12:00 - 17:00
  1.00, 1.10, 1.15, 1.15, 1.12, 1.10, // 18:00 - 23:00
  1.05,                               // 24:00 (loop back to midnight)
] as const;

/**
 * Linearly interpolates the diurnal factor for any fractional hour in [0, 24].
 */
export function getDiurnalFactor(hour: number): number {
  const h = Math.max(0, Math.min(24, hour));
  const baseIndex = Math.floor(h);
  const frac = h - baseIndex;
  const nextIndex = Math.min(24, baseIndex + 1);
  return DIURNAL_FACTORS[baseIndex] * (1 - frac) + DIURNAL_FACTORS[nextIndex] * frac;
}

/**
 * Formats hour integer (0-23) into clean IST representation, e.g. "18:00 IST".
 */
export function formatHourIST(hour: number): string {
  const h = Math.floor(Math.max(0, Math.min(23, hour)));
  return `${String(h).padStart(2, '0')}:00 IST`;
}

/**
 * NAQI category band thresholds as defined by the Central Pollution Control Board (CPCB).
 */
export const CPCB_THRESHOLDS: Record<ActivePollutant, number[]> = {
  'PM2.5': [30, 60, 90, 120, 250],
  'PM10': [50, 100, 250, 350, 430],
  'NAQI': [50, 100, 200, 300, 400],
};

export interface CpcbCategoryInfo {
  index: number;
  name: 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';
  color: string;
  bgLight: string;
  borderLight: string;
}

export const CPCB_CATEGORIES: CpcbCategoryInfo[] = [
  { index: 0, name: 'Good', color: '#24764B', bgLight: 'bg-emerald-50', borderLight: 'border-emerald-200' },
  { index: 1, name: 'Satisfactory', color: '#84CC16', bgLight: 'bg-lime-50', borderLight: 'border-lime-200' },
  { index: 2, name: 'Moderate', color: '#D97706', bgLight: 'bg-amber-50', borderLight: 'border-amber-200' },
  { index: 3, name: 'Poor', color: '#EA580C', bgLight: 'bg-orange-50', borderLight: 'border-orange-200' },
  { index: 4, name: 'Very Poor', color: '#DC2626', bgLight: 'bg-red-50', borderLight: 'border-red-200' },
  { index: 5, name: 'Severe', color: '#7F1D1D', bgLight: 'bg-rose-950/10', borderLight: 'border-rose-300' },
];

/**
 * Determines CPCB NAQI category for a concentration or index value.
 */
export function getCpcbCategory(value: number, pollutant: ActivePollutant): CpcbCategoryInfo {
  const thresholds = CPCB_THRESHOLDS[pollutant];
  let catIndex = 0;
  while (catIndex < thresholds.length && value > thresholds[catIndex]) {
    catIndex++;
  }
  return CPCB_CATEGORIES[catIndex] ?? CPCB_CATEGORIES[CPCB_CATEGORIES.length - 1];
}

/**
 * Illustrative prototype proxy for NAQI based on PM2.5 (PM2.5 × 1.35).
 * Note: Real CPCB calculation uses segmented linear interpolation of sub-indices.
 */
export function getNaqiEstimate(pm25: number): number {
  return Math.round(pm25 * 1.35);
}
