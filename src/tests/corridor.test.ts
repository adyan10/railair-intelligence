import { describe, it, expect } from 'vitest';
import { STATIONS } from '../data/mock';
import { getCpcbCategory, getDiurnalFactor, getNaqiEstimate, CPCB_THRESHOLDS } from '../lib/diurnal';

describe('Corridor Map Data & Station Metadata (Phase 2)', () => {
  it('contains 7 monitored stations along the Meerut-Delhi mainline', () => {
    expect(STATIONS).toHaveLength(7);
    expect(STATIONS.map((s) => s.id)).toEqual(['MRT', 'MMU', 'MNR', 'GZB', 'SAH', 'DSO', 'NDLS']);
  });

  it('provides railway technical specs (platforms and division subtext) for each station', () => {
    STATIONS.forEach((station) => {
      expect(station.platforms).toBeDefined();
      expect(station.platforms).toMatch(/\d+ Platforms/);
      expect(station.sub).toBeDefined();
      expect(station.position.lat).toBeGreaterThan(28);
      expect(station.position.lng).toBeGreaterThan(77);
    });
  });

  it('correctly calculates sample JSON record payload format', () => {
    const ndls = STATIONS.find((s) => s.id === 'NDLS')!;
    const hour = 18;
    const factor = getDiurnalFactor(hour);
    const pm25 = ndls.observations.find((o) => o.pollutant === 'PM2.5')?.value ?? 0;
    const pm10 = ndls.observations.find((o) => o.pollutant === 'PM10')?.value ?? 0;

    const record = {
      instrument: 'RailAir.Intel',
      data_notice: 'Simulated prototype data (not a live CPCB feed)',
      station_code: ndls.id,
      station_name: ndls.name,
      coordinates_wgs84: [ndls.position.lat, ndls.position.lng],
      hour_ist: hour,
      pm2_5_ug_m3: Math.round(pm25 * factor),
      pm10_ug_m3: Math.round(pm10 * factor),
    };

    expect(record.instrument).toBe('RailAir.Intel');
    expect(record.station_code).toBe('NDLS');
    expect(record.pm2_5_ug_m3).toBe(168);
    expect(record.pm10_ug_m3).toBe(289);
    expect(record.coordinates_wgs84).toEqual([28.6419, 77.2194]);
  });

  it('resolves CPCB thresholds and colors correctly for legend ticks', () => {
    const pm25Ticks = ['0', ...CPCB_THRESHOLDS['PM2.5'].slice(0, 4).map(String), `${CPCB_THRESHOLDS['PM2.5'][4]}+`];
    expect(pm25Ticks).toEqual(['0', '30', '60', '90', '120', '250+']);

    const catGood = getCpcbCategory(25, 'PM2.5');
    expect(catGood.name).toBe('Good');
    expect(catGood.color).toBe('#24764B');

    const catSevere = getCpcbCategory(300, 'PM2.5');
    expect(catSevere.name).toBe('Severe');
    expect(catSevere.color).toBe('#7F1D1D');
  });

  it('calculates NAQI proxy estimate accurately', () => {
    const pm25Val = 100;
    const naqiVal = getNaqiEstimate(pm25Val);
    expect(naqiVal).toBe(135);
    const cat = getCpcbCategory(naqiVal, 'NAQI');
    expect(cat.name).toBe('Moderate');
  });
});
