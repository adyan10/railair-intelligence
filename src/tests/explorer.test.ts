import { describe, it, expect } from 'vitest';
import {
  generatePeriods,
  classifyAqi,
  haversineKm,
  environmentalApiClient,
  CANONICAL_CORRIDOR_STATIONS,
  CORRIDOR_TRACK_COORDINATES,
} from '../services/environmentalApiClient';

describe('Environmental Explorer & Historical Timeline Core Engine', () => {
  it('generates exactly 72 discrete monthly periods spanning 2017 to 2022', () => {
    const periods = generatePeriods();
    expect(periods).toHaveLength(72);
    expect(periods[0].period).toBe('2017-01');
    expect(periods[0].label).toBe('Jan 2017');
    expect(periods[71].period).toBe('2022-12');
    expect(periods[71].label).toBe('Dec 2022');

    // Strict non-extrapolation: no dates before 2017 or after 2022
    for (const p of periods) {
      expect(p.year).toBeGreaterThanOrEqual(2017);
      expect(p.year).toBeLessThanOrEqual(2022);
      expect(p.month).toBeGreaterThanOrEqual(1);
      expect(p.month).toBeLessThanOrEqual(12);
    }
  });

  it('classifies PM2.5 and PM10 into official CPCB AQI categories and color hexes', () => {
    // PM2.5 categories
    expect(classifyAqi('PM2.5', 25)).toEqual({ category: 'Good', color: '#10B981' });
    expect(classifyAqi('PM2.5', 45)).toEqual({ category: 'Satisfactory', color: '#84CC16' });
    expect(classifyAqi('PM2.5', 75)).toEqual({ category: 'Moderate', color: '#EAB308' });
    expect(classifyAqi('PM2.5', 110)).toEqual({ category: 'Poor', color: '#F97316' });
    expect(classifyAqi('PM2.5', 180)).toEqual({ category: 'Very Poor', color: '#EF4444' });
    expect(classifyAqi('PM2.5', 310)).toEqual({ category: 'Severe', color: '#7F1D1D' });

    // PM10 categories
    expect(classifyAqi('PM10', 40)).toEqual({ category: 'Good', color: '#10B981' });
    expect(classifyAqi('PM10', 80)).toEqual({ category: 'Satisfactory', color: '#84CC16' });
    expect(classifyAqi('PM10', 160)).toEqual({ category: 'Moderate', color: '#EAB308' });
    expect(classifyAqi('PM10', 290)).toEqual({ category: 'Poor', color: '#F97316' });
    expect(classifyAqi('PM10', 390)).toEqual({ category: 'Very Poor', color: '#EF4444' });
    expect(classifyAqi('PM10', 480)).toEqual({ category: 'Severe', color: '#7F1D1D' });

    // Null / No data preservation
    expect(classifyAqi('PM2.5', null)).toEqual({ category: 'No Data', color: '#94A3B8' });
  });

  it('returns contiguous 64-cell grid with valid bounding polygons and coverage', async () => {
    const grid = await environmentalApiClient.fetchGrid('PM2.5', 2022, 12);
    expect(grid.total_cells).toBe(64);
    expect(grid.cells).toHaveLength(64);
    expect(grid.period).toBe('2022-12');
    expect(grid.dataset_id).toBe('zenodo_gridded_pm_v2');

    // All cells must have non-inverted bounding coordinates
    for (const cell of grid.cells) {
      expect(cell.bounds.south).toBeLessThan(cell.bounds.north);
      expect(cell.bounds.west).toBeLessThan(cell.bounds.east);
      expect(cell.value).toBeGreaterThan(0);
      expect(cell.color.startsWith('#')).toBe(true);
      expect(cell.nearest_station).toBeTruthy();
    }

    // Regional statistics
    expect(grid.summary.valid_cells).toBe(64);
    expect(grid.summary.no_data_cells).toBe(0);
    expect(grid.summary.coverage_pct).toBe(100.0);
    expect(grid.summary.mean).toBeGreaterThan(0);
    expect(grid.summary.max).toBeGreaterThanOrEqual(grid.summary.min);
  });

  it('performs point inspection and finds nearest grid cell and 72-month time series', async () => {
    // New Delhi Railway Station coordinates
    const inspection = await environmentalApiClient.fetchInspection(28.6429, 77.2195, 'PM2.5', 2022, 12);
    expect(inspection.dataset_id).toBe('zenodo_gridded_pm_v2');
    expect(inspection.period).toBe('2022-12');
    expect(inspection.distance_to_query_km).toBeLessThan(15);
    expect(inspection.timeseries).toHaveLength(72);
  });

  it('preserves all 7 canonical corridor stations and aligns track coordinates', () => {
    expect(CANONICAL_CORRIDOR_STATIONS).toHaveLength(7);
    const stationIds = CANONICAL_CORRIDOR_STATIONS.map((s) => s.id);
    expect(stationIds).toEqual(['MRT', 'MMU', 'MNR', 'GZB', 'SAH', 'DSO', 'NDLS']);

    expect(CORRIDOR_TRACK_COORDINATES).toHaveLength(7);
    // Distance from MRT (Meerut) to NDLS (New Delhi) ~83 km
    const totalDist = haversineKm(
      CORRIDOR_TRACK_COORDINATES[0][0],
      CORRIDOR_TRACK_COORDINATES[0][1],
      CORRIDOR_TRACK_COORDINATES[6][0],
      CORRIDOR_TRACK_COORDINATES[6][1]
    );
    expect(totalDist).toBeGreaterThan(50);
    expect(totalDist).toBeLessThan(90);
  });

  it('performs scientific bilinear spatial interpolation over the 8x8 grid without extrapolation', async () => {
    const { buildGridMatrix, sampleBilinearConcentration, CORRIDOR_ENVELOPE, interpolateRampColor } = await import(
      '../services/rasterInterpolation'
    );
    const grid = await environmentalApiClient.fetchGrid('PM2.5', 2022, 12);
    const matrix = buildGridMatrix(grid.cells);

    expect(matrix).toHaveLength(8);
    expect(matrix[0]).toHaveLength(8);

    expect(CORRIDOR_ENVELOPE.south).toBeLessThan(CORRIDOR_ENVELOPE.north);
    expect(CORRIDOR_ENVELOPE.west).toBeLessThan(CORRIDOR_ENVELOPE.east);

    // Coordinate inside corridor (Ghaziabad / New Delhi area)
    const val = sampleBilinearConcentration(28.6676, 77.3434, matrix);
    expect(val).not.toBeNull();
    expect(val!).toBeGreaterThan(50);
    expect(val!).toBeLessThan(350);

    // Coordinates outside dataset footprint must return null (strict non-extrapolation)
    const outNorth = sampleBilinearConcentration(30.5, 77.5, matrix);
    expect(outNorth).toBeNull();
    const outWest = sampleBilinearConcentration(28.6, 76.5, matrix);
    expect(outWest).toBeNull();

    // Verify continuous color ramp returns valid RGB values
    const c1 = interpolateRampColor(25, 'PM2.5'); // Good (emerald teal)
    expect(c1.r).toBeGreaterThanOrEqual(0);
    expect(c1.g).toBeGreaterThan(150);

    const c2 = interpolateRampColor(150, 'PM2.5'); // Very poor (crimson/coral)
    expect(c2.r).toBeGreaterThan(180);

    const c3 = interpolateRampColor(220, 'PM2.5'); // Severe (purple)
    expect(c3.r).toBeGreaterThan(100);
    expect(c3.b).toBeGreaterThan(150);
  });
});
