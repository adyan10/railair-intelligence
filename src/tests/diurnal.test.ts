import { describe, it, expect } from 'vitest';
import {
  getDiurnalFactor,
  formatHourIST,
  getCpcbCategory,
  getNaqiEstimate,
  CPCB_THRESHOLDS,
  DIURNAL_FACTORS,
} from '../lib/diurnal';

describe('getDiurnalFactor', () => {
  it('returns baseline factor of 1.00 at hour 18:00', () => {
    expect(getDiurnalFactor(18)).toBe(1.00);
  });

  it('returns nocturnal thermal inversion peak factor of 1.15 at 20:00 and 21:00', () => {
    expect(getDiurnalFactor(20)).toBe(1.15);
    expect(getDiurnalFactor(21)).toBe(1.15);
  });

  it('returns afternoon dispersion trough factor of 0.62 at 13:00 and 14:00', () => {
    expect(getDiurnalFactor(13)).toBe(0.62);
    expect(getDiurnalFactor(14)).toBe(0.62);
  });

  it('interpolates fractional hours linearly', () => {
    // Hour 17 is 0.92, Hour 18 is 1.00. Hour 17.5 should be exactly 0.96.
    expect(getDiurnalFactor(17.5)).toBeCloseTo(0.96, 4);
  });

  it('clamps values below 0 and above 24', () => {
    expect(getDiurnalFactor(-5)).toBe(DIURNAL_FACTORS[0]);
    expect(getDiurnalFactor(30)).toBe(DIURNAL_FACTORS[24]);
  });
});

describe('formatHourIST', () => {
  it('formats hours with leading zeros and IST suffix', () => {
    expect(formatHourIST(0)).toBe('00:00 IST');
    expect(formatHourIST(8)).toBe('08:00 IST');
    expect(formatHourIST(18)).toBe('18:00 IST');
    expect(formatHourIST(23)).toBe('23:00 IST');
  });

  it('handles out of range hours by clamping', () => {
    expect(formatHourIST(-2)).toBe('00:00 IST');
    expect(formatHourIST(25)).toBe('23:00 IST');
  });
});

describe('getCpcbCategory', () => {
  it('categorizes PM2.5 correctly across NAQI bands', () => {
    expect(getCpcbCategory(25, 'PM2.5').name).toBe('Good');
    expect(getCpcbCategory(55, 'PM2.5').name).toBe('Satisfactory');
    expect(getCpcbCategory(85, 'PM2.5').name).toBe('Moderate');
    expect(getCpcbCategory(115, 'PM2.5').name).toBe('Poor');
    expect(getCpcbCategory(180, 'PM2.5').name).toBe('Very Poor');
    expect(getCpcbCategory(320, 'PM2.5').name).toBe('Severe');
  });

  it('categorizes PM10 correctly', () => {
    expect(getCpcbCategory(40, 'PM10').name).toBe('Good');
    expect(getCpcbCategory(180, 'PM10').name).toBe('Moderate');
    expect(getCpcbCategory(450, 'PM10').name).toBe('Severe');
  });

  it('categorizes NAQI index correctly', () => {
    expect(getCpcbCategory(45, 'NAQI').name).toBe('Good');
    expect(getCpcbCategory(150, 'NAQI').name).toBe('Moderate');
    expect(getCpcbCategory(250, 'NAQI').name).toBe('Poor');
    expect(getCpcbCategory(350, 'NAQI').name).toBe('Very Poor');
    expect(getCpcbCategory(450, 'NAQI').name).toBe('Severe');
  });
});

describe('getNaqiEstimate', () => {
  it('calculates illustrative NAQI approximation from PM2.5', () => {
    expect(getNaqiEstimate(100)).toBe(135);
    expect(getNaqiEstimate(184)).toBe(248);
    expect(getNaqiEstimate(0)).toBe(0);
  });
});

describe('CPCB_THRESHOLDS', () => {
  it('defines standard threshold steps for PM2.5, PM10, and NAQI', () => {
    expect(CPCB_THRESHOLDS['PM2.5']).toEqual([30, 60, 90, 120, 250]);
    expect(CPCB_THRESHOLDS['PM10']).toEqual([50, 100, 250, 350, 430]);
    expect(CPCB_THRESHOLDS['NAQI']).toEqual([50, 100, 200, 300, 400]);
  });
});

