import { describe, it, expect } from 'vitest';
import { environmentalApiClient } from '../services/environmentalApiClient';

describe('Environmental Command Centre Analytics & Synchronization', () => {
  it('fetches ranked regional hotspots sorted strictly descending by concentration', async () => {
    const hotspots = await environmentalApiClient.fetchHotspots('PM2.5', 2022, 12, 8);
    expect(hotspots.total_hotspots).toBe(8);
    expect(hotspots.items).toHaveLength(8);
    expect(hotspots.dataset_id).toBe('zenodo_gridded_pm_v2');

    const items = hotspots.items;
    for (let i = 0; i < items.length - 1; i++) {
      expect(items[i].value).toBeGreaterThanOrEqual(items[i + 1].value);
      expect(items[i].rank).toBe(i + 1);
      expect(items[i].color.startsWith('#')).toBe(true);
    }
  });

  it('compares regional ambient conditions across all 7 canonical corridor stations', async () => {
    const comparison = await environmentalApiClient.fetchCorridorComparison('PM2.5', 2022, 12);
    expect(comparison).toHaveLength(7);

    const stationIds = comparison.map((s) => s.station_id);
    expect(stationIds).toEqual(['MRT', 'MMU', 'MNR', 'GZB', 'SAH', 'DSO', 'NDLS']);

    const irCodes = Object.fromEntries(comparison.map((s) => [s.station_id, s.ir_code]));
    expect(irCodes).toEqual({
      MRT: 'MTC',
      MMU: 'MDNR',
      MNR: 'MUD',
      GZB: 'GZB',
      SAH: 'SBB',
      DSO: 'DSA',
      NDLS: 'NDLS',
    });

    for (const st of comparison) {
      expect(st.ambient_grid_value).toBeGreaterThan(0);
      expect(st.distance_to_cell_km).toBeLessThan(15);
      expect(st.unit).toBe('µg/m³');
      expect(st.category).toBeTruthy();
    }
  });

  it('validates 72-month multi-year seasonal history exhibiting winter peaks and monsoon dips', async () => {
    const ts = await environmentalApiClient.fetchTimeseries('grid_28.67_77.24', 28.6676, 77.2431, 'PM2.5');
    expect(ts.total_points).toBe(72);
    expect(ts.timeseries).toHaveLength(72);

    // Delhi NCR meteorological dynamics: Winter (Nov-Jan) mean must be significantly higher than Monsoon (Jul-Aug)
    expect(ts.winter_peak_mean).toBeGreaterThan(ts.monsoon_dip_mean);
    expect(ts.overall_max).toBeGreaterThan(ts.overall_min);
    expect(ts.dataset_id).toBe('zenodo_gridded_pm_v2');
  });

  it('synchronizes data across PM2.5 and PM10 with consistent higher values for coarse PM10', async () => {
    const [pm25Grid, pm10Grid] = await Promise.all([
      environmentalApiClient.fetchGrid('PM2.5', 2022, 12),
      environmentalApiClient.fetchGrid('PM10', 2022, 12),
    ]);

    expect(pm10Grid.summary.mean).toBeGreaterThan(pm25Grid.summary.mean);
    expect(pm10Grid.summary.max).toBeGreaterThan(pm25Grid.summary.max);
    expect(pm25Grid.cells).toHaveLength(64);
    expect(pm10Grid.cells).toHaveLength(64);
  });
});
