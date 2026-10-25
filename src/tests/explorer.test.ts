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

  it('implements rounded envelope feathering without artificial hard rectangular borders', async () => {
    const { roundedEnvelopeFactor } = await import('../services/rasterInterpolation');

    // Inside center of canvas (256x256) -> full opacity (1.0)
    expect(roundedEnvelopeFactor(128, 128, 256, 256)).toBe(1.0);

    // Outside / at exact border (x=0, y=0) -> zero opacity (0.0)
    expect(roundedEnvelopeFactor(0, 0, 256, 256)).toBe(0.0);

    // Corner region (x=10, y=10) should be gracefully feathered / rounded
    const cornerVal = roundedEnvelopeFactor(10, 10, 256, 256, 24, 14);
    expect(cornerVal).toBeGreaterThanOrEqual(0.0);
    expect(cornerVal).toBeLessThan(1.0);
  });

  it('evaluates multi-scale zoom tiers and prevents geographic extrapolation', async () => {
    const { getZoomScaleState, isCoordinateWithinCoverage, CORRIDOR_BOUNDS } = await import(
      '../services/datasetMetadata'
    );

    // Zoom 10 -> Corridor Focus
    const zoomCorridor = getZoomScaleState(10);
    expect(zoomCorridor.tier).toBe('corridor');
    expect(zoomCorridor.isOutsideCorridor).toBe(false);

    // Zoom 8 -> Wider NCR View
    const zoomNCR = getZoomScaleState(8);
    expect(zoomNCR.tier).toBe('regional_ncr');
    expect(zoomNCR.isOutsideCorridor).toBe(true);

    // Zoom 5 -> National View
    const zoomNational = getZoomScaleState(5);
    expect(zoomNational.tier).toBe('national_india');
    expect(zoomNational.isOutsideCorridor).toBe(true);

    // Coordinate containment
    // Delhi / Ghaziabad center
    expect(isCoordinateWithinCoverage(28.6676, 77.3434)).toBe(true);
    // Mumbai (outside corridor)
    expect(isCoordinateWithinCoverage(19.076, 72.8777)).toBe(false);
    // Kolkata (outside corridor)
    expect(isCoordinateWithinCoverage(22.5726, 88.3639)).toBe(false);

    // Bounds integrity
    expect(CORRIDOR_BOUNDS.south).toBeLessThan(CORRIDOR_BOUNDS.north);
    expect(CORRIDOR_BOUNDS.west).toBeLessThan(CORRIDOR_BOUNDS.east);
  });

  it('provides verified dataset catalog distinguishing modelled estimates from ground truth', async () => {
    const { getAllDatasets, getActiveDataset } = await import('../services/datasetMetadata');

    const datasets = getAllDatasets();
    expect(datasets.length).toBeGreaterThanOrEqual(3);

    const active = getActiveDataset();
    expect(active.dataset_id).toBe('zenodo_gridded_pm_v2');
    expect(active.measurement_type).toBe('modelled_estimate');
    expect(active.spatial_coverage.resolution_km).toBe(10);
    expect(active.temporal_coverage.total_periods).toBe(72);
    expect(active.license).toContain('CC-BY 4.0');

    // Ground station dataset (CPCB)
    const cpcb = datasets.find((d) => d.dataset_id === 'cpcb_caaqms_realtime');
    expect(cpcb).toBeDefined();
    expect(cpcb!.measurement_type).toBe('ground_observation');
    expect(cpcb!.license).toContain('GODL');

    // Satellite dataset (Mendeley Sentinel-5P)
    const mendeley = datasets.find((d) => d.dataset_id === 'mendeley_satellite_gases');
    expect(mendeley).toBeDefined();
    expect(mendeley!.measurement_type).toBe('satellite');
  });

  it('caches historical period grid data in memory during playback', async () => {
    const g1 = await environmentalApiClient.fetchGrid('PM2.5', 2022, 12);
    const g2 = await environmentalApiClient.fetchGrid('PM2.5', 2022, 12);
    // Cached response should return the exact same object reference
    expect(g1).toBe(g2);
  });

  // ==========================================================================
  // Localised Pollution Rendering & Pipeline Verification Tests
  // ==========================================================================

  it('proves two cells with different source values receive the correct corresponding colours', async () => {
    const { interpolateRampColorHex } = await import('../services/rasterInterpolation');
    const grid = await environmentalApiClient.fetchGrid('PM2.5', 2022, 12);

    const values = grid.cells.map((c) => c.value ?? 0);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    const minCell = grid.cells.find((c) => c.value === minVal)!;
    const maxCell = grid.cells.find((c) => c.value === maxVal)!;

    // Both cells must retain their distinct concentrations
    expect(minVal).toBeLessThan(maxVal);
    expect(maxVal - minVal).toBeGreaterThan(30); // At least 30 µg/m³ spread in Dec 2022

    // Both cells must calculate their own distinct colors from the continuous scale
    const minColor = interpolateRampColorHex(minCell.value!, 'PM2.5');
    const maxColor = interpolateRampColorHex(maxCell.value!, 'PM2.5');

    expect(minColor).not.toEqual(maxColor);
    expect(minCell.color).toBe(minColor);
    expect(maxCell.color).toBe(maxColor);
  });

  it('proves the raster is driven by per-cell values rather than the regional mean', async () => {
    const { buildGridMatrix, sampleBilinearConcentration, interpolateRampColorHex } = await import(
      '../services/rasterInterpolation'
    );
    const grid = await environmentalApiClient.fetchGrid('PM2.5', 2022, 12);
    const matrix = buildGridMatrix(grid.cells);

    // Sample at southwest rural node
    const swVal = sampleBilinearConcentration(28.467, 77.1429, matrix)!;
    // Sample at northeast / corridor urban node
    const neVal = sampleBilinearConcentration(28.6676, 77.8446, matrix)!;

    // The sampled field must vary spatially and not equal the regional mean everywhere
    expect(swVal).toBeLessThan(grid.summary.mean);
    expect(neVal).toBeGreaterThan(grid.summary.mean);
    expect(swVal).not.toEqual(neVal);

    const swColor = interpolateRampColorHex(swVal, 'PM2.5');
    const neColor = interpolateRampColorHex(neVal, 'PM2.5');
    const meanColor = interpolateRampColorHex(grid.summary.mean, 'PM2.5');

    expect(swColor).not.toEqual(meanColor);
    expect(neColor).not.toEqual(meanColor);
  });

  it('proves a change in one cell affects its local rendering rather than recolouring the entire region uniformly', async () => {
    const { buildGridMatrix, sampleBilinearConcentration, interpolateRampColorHex } = await import(
      '../services/rasterInterpolation'
    );
    const grid = await environmentalApiClient.fetchGrid('PM2.5', 2022, 12);

    // Deep clone the cells
    const clonedCells = JSON.parse(JSON.stringify(grid.cells));
    const matrixOriginal = buildGridMatrix(clonedCells);

    // Perturb only cell [0][0] (southwest corner)
    const targetCell = clonedCells.find(
      (c: { latitude: number; longitude: number; value: number }) =>
        Math.abs(c.latitude - 28.467) < 0.01 && Math.abs(c.longitude - 77.1429) < 0.01
    )!;
    targetCell.value = 250.0; // Perturb to extreme severe level

    const matrixPerturbed = buildGridMatrix(clonedCells);

    // Local coordinate (near southwest corner)
    const localBefore = sampleBilinearConcentration(28.467, 77.1429, matrixOriginal)!;
    const localAfter = sampleBilinearConcentration(28.467, 77.1429, matrixPerturbed)!;
    expect(localAfter).not.toEqual(localBefore);
    expect(interpolateRampColorHex(localAfter, 'PM2.5')).not.toEqual(interpolateRampColorHex(localBefore, 'PM2.5'));

    // Distant coordinate (northeast corner at 29.1691, 77.8446)
    const distantBefore = sampleBilinearConcentration(29.1691, 77.8446, matrixOriginal)!;
    const distantAfter = sampleBilinearConcentration(29.1691, 77.8446, matrixPerturbed)!;

    // Distant node must remain completely unaffected by the single local cell change
    expect(distantAfter).toEqual(distantBefore);
    expect(interpolateRampColorHex(distantAfter, 'PM2.5')).toEqual(interpolateRampColorHex(distantBefore, 'PM2.5'));
  });

  it('proves changing the month updates the actual spatial values', async () => {
    // Dec 2022 (winter peak) vs Jul 2022 (monsoon clean)
    const decGrid = await environmentalApiClient.fetchGrid('PM2.5', 2022, 12);
    const julGrid = await environmentalApiClient.fetchGrid('PM2.5', 2022, 7);

    expect(decGrid.summary.mean).toBeGreaterThan(120);
    expect(julGrid.summary.mean).toBeLessThan(50);

    // Every single cell's spatial value must update
    const decVals = decGrid.cells.map((c) => c.value);
    const julVals = julGrid.cells.map((c) => c.value);

    expect(decVals).not.toEqual(julVals);
    for (let i = 0; i < 64; i++) {
      expect(decVals[i]!).toBeGreaterThan(julVals[i]!);
    }
  });

  it('proves changing PM2.5 to PM10 uses the correct values and scale', async () => {
    const { getColorScaleGradientCss, PM25_COLOR_RAMP, PM10_COLOR_RAMP } = await import(
      '../services/rasterInterpolation'
    );
    const pm25Grid = await environmentalApiClient.fetchGrid('PM2.5', 2022, 12);
    const pm10Grid = await environmentalApiClient.fetchGrid('PM10', 2022, 12);

    // Coarse particulate PM10 values must exceed fine particulate PM2.5
    expect(pm10Grid.summary.mean).toBeGreaterThan(pm25Grid.summary.mean);
    expect(pm10Grid.unit).toBe('µg/m³');
    expect(pm25Grid.unit).toBe('µg/m³');

    // Scale thresholds differ appropriately
    expect(PM10_COLOR_RAMP[PM10_COLOR_RAMP.length - 1].threshold).toBeGreaterThan(
      PM25_COLOR_RAMP[PM25_COLOR_RAMP.length - 1].threshold
    );

    const grad25 = getColorScaleGradientCss('PM2.5');
    const grad10 = getColorScaleGradientCss('PM10');
    expect(grad25).not.toEqual(grad10);
    expect(grad25).toContain('#10B981');
    expect(grad10).toContain('#10B981');
  });

  it('proves inspection reports the original source-cell value', async () => {
    // Inspection query at southwest coordinate near node (28.467, 77.1429)
    const inspection = await environmentalApiClient.fetchInspection(28.48, 77.15, 'PM2.5', 2022, 12);

    expect(inspection.grid_id).toBe('grid_28.47_77.14');
    expect(inspection.value).toBeGreaterThan(100);
    expect(inspection.cell_latitude).toBeCloseTo(28.467, 2);
    expect(inspection.cell_longitude).toBeCloseTo(77.1429, 2);
    expect(inspection.distance_to_query_km).toBeGreaterThanOrEqual(0);
    expect(inspection.distance_to_query_km).toBeLessThan(10);
  });

  it('proves zooming out does not extend the data beyond its valid footprint', async () => {
    const { sampleBilinearConcentration, buildGridMatrix, CORRIDOR_ENVELOPE } = await import(
      '../services/rasterInterpolation'
    );
    const { isCoordinateWithinCoverage } = await import('../services/datasetMetadata');
    const grid = await environmentalApiClient.fetchGrid('PM2.5', 2022, 12);
    const matrix = buildGridMatrix(grid.cells);

    // Valid location inside footprint
    expect(sampleBilinearConcentration(28.8, 77.5, matrix)).not.toBeNull();
    expect(isCoordinateWithinCoverage(28.8, 77.5)).toBe(true);

    // Far outside footprint (e.g. Mumbai, Bangalore, or high latitude)
    expect(sampleBilinearConcentration(19.076, 72.8777, matrix)).toBeNull();
    expect(sampleBilinearConcentration(31.5, 77.5, matrix)).toBeNull();
    expect(sampleBilinearConcentration(27.0, 77.5, matrix)).toBeNull();

    expect(isCoordinateWithinCoverage(19.076, 72.8777)).toBe(false);
    expect(isCoordinateWithinCoverage(31.5, 77.5)).toBe(false);

    // Envelope boundaries are strictly constrained to Delhi-NCR corridor
    expect(CORRIDOR_ENVELOPE.south).toBeGreaterThan(28.0);
    expect(CORRIDOR_ENVELOPE.north).toBeLessThan(30.0);
    expect(CORRIDOR_ENVELOPE.west).toBeGreaterThan(76.5);
    expect(CORRIDOR_ENVELOPE.east).toBeLessThan(78.5);
  });
});
