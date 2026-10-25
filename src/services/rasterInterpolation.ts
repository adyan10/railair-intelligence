/**
 * RailAir Intelligence — Continuous Spatial Interpolation & Raster Engine
 *
 * Implements scientifically defensible bilinear spatial interpolation over the
 * coarse 10 km (8x8) PM2.5/PM10 gridded baseline to produce a continuous Windy.com-style
 * pollution field with soft boundary feathering and perceptually tuned color transitions.
 *
 * Note: Visual interpolation is a cartographic rendering technique; underlying
 * source data precision remains the verified 10 km grid cells.
 */

import type { EnvironmentalPollutant, GridCellRecord } from '../types/environmental';

export interface RasterEnvelope {
  south: number;
  west: number;
  north: number;
  east: number;
}

export const CORRIDOR_ENVELOPE: RasterEnvelope = {
  south: 28.41685,
  west: 77.092775,
  north: 29.21925,
  east: 77.894725,
};

// 8x8 Grid Node Centroids (WGS84)
export const GRID_LATS = [28.467, 28.5673, 28.6676, 28.7679, 28.8682, 28.9685, 29.0688, 29.1691];
export const GRID_LONS = [77.1429, 77.2431, 77.3434, 77.4436, 77.5439, 77.6441, 77.7444, 77.8446];

export interface ColorStop {
  threshold: number;
  r: number;
  g: number;
  b: number;
  hex: string;
  label: string;
}

// Documented high-discrimination continuous color ramps (CPCB-aligned with fine spatial milestones)
export const PM25_COLOR_RAMP: ColorStop[] = [
  { threshold: 0, r: 16, g: 185, b: 129, hex: '#10B981', label: '0' },     // Emerald (Good)
  { threshold: 30, r: 132, g: 204, b: 22, hex: '#84CC16', label: '30' },   // Lime (Satisfactory)
  { threshold: 60, r: 245, g: 158, b: 11, hex: '#F59E0B', label: '60' },   // Amber (Moderate)
  { threshold: 90, r: 249, g: 115, b: 22, hex: '#F97316', label: '90' },   // Orange (Poor)
  { threshold: 120, r: 239, g: 68, b: 68, hex: '#EF4444', label: '120' },  // Coral Red (Very Poor lower bound)
  { threshold: 150, r: 219, g: 39, b: 119, hex: '#DB2777', label: '150' }, // Rose / Magenta
  { threshold: 180, r: 147, g: 51, b: 234, hex: '#9333EA', label: '180' }, // Violet / Purple
  { threshold: 250, r: 88, g: 28, b: 135, hex: '#581C87', label: '250+' }, // Deep Plum (Severe)
];

export const PM10_COLOR_RAMP: ColorStop[] = [
  { threshold: 0, r: 16, g: 185, b: 129, hex: '#10B981', label: '0' },     // Emerald (Good)
  { threshold: 50, r: 132, g: 204, b: 22, hex: '#84CC16', label: '50' },   // Lime (Satisfactory)
  { threshold: 100, r: 245, g: 158, b: 11, hex: '#F59E0B', label: '100' }, // Amber (Moderate)
  { threshold: 175, r: 249, g: 115, b: 22, hex: '#F97316', label: '175' }, // Orange (Poor)
  { threshold: 250, r: 239, g: 68, b: 68, hex: '#EF4444', label: '250' },  // Coral Red (Very Poor)
  { threshold: 300, r: 219, g: 39, b: 119, hex: '#DB2777', label: '300' }, // Rose / Magenta
  { threshold: 350, r: 147, g: 51, b: 234, hex: '#9333EA', label: '350' }, // Violet / Purple
  { threshold: 430, r: 88, g: 28, b: 135, hex: '#581C87', label: '430' },  // Deep Plum (Severe)
  { threshold: 500, r: 59, g: 7, b: 100, hex: '#3B0764', label: '500+' },  // Dark Maroon (Hazardous)
];

/**
 * Interpolates RGBA color smoothly between ramp thresholds.
 */
export function interpolateRampColor(
  value: number,
  pollutant: EnvironmentalPollutant
): { r: number; g: number; b: number } {
  const ramp = pollutant === 'PM2.5' ? PM25_COLOR_RAMP : PM10_COLOR_RAMP;

  if (value <= ramp[0].threshold) {
    return { r: ramp[0].r, g: ramp[0].g, b: ramp[0].b };
  }
  const last = ramp[ramp.length - 1];
  if (value >= last.threshold) {
    return { r: last.r, g: last.g, b: last.b };
  }

  for (let i = 0; i < ramp.length - 1; i++) {
    const s0 = ramp[i];
    const s1 = ramp[i + 1];
    if (value >= s0.threshold && value <= s1.threshold) {
      const t = (value - s0.threshold) / (s1.threshold - s0.threshold);
      return {
        r: Math.round(s0.r + t * (s1.r - s0.r)),
        g: Math.round(s0.g + t * (s1.g - s0.g)),
        b: Math.round(s0.b + t * (s1.b - s0.b)),
      };
    }
  }

  return { r: last.r, g: last.g, b: last.b };
}

/**
 * Returns hex color string (#rrggbb) from continuous color scale for a given concentration.
 */
export function interpolateRampColorHex(
  value: number,
  pollutant: EnvironmentalPollutant
): string {
  const { r, g, b } = interpolateRampColor(value, pollutant);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Calculates continuous CSS gradient strictly matching the mathematical stops and percentages of the active color scale.
 */
export function getColorScaleGradientCss(pollutant: EnvironmentalPollutant): string {
  const ramp = pollutant === 'PM2.5' ? PM25_COLOR_RAMP : PM10_COLOR_RAMP;
  const min = ramp[0].threshold;
  const max = ramp[ramp.length - 1].threshold;
  const stops = ramp.map((s) => {
    const pct = Math.round(((s.threshold - min) / (max - min)) * 1000) / 10;
    return `${s.hex} ${pct}%`;
  });
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

/**
 * Converts 64 flat grid cell records into an 8x8 matrix sorted south-to-north, west-to-east.
 */
export function buildGridMatrix(cells: GridCellRecord[]): number[][] {
  const matrix: number[][] = Array.from({ length: 8 }, () => Array(8).fill(0));

  for (const cell of cells) {
    // Find closest lat and lon indices
    let bestR = 0;
    let minDLat = Infinity;
    for (let r = 0; r < 8; r++) {
      const d = Math.abs(cell.latitude - GRID_LATS[r]);
      if (d < minDLat) {
        minDLat = d;
        bestR = r;
      }
    }

    let bestC = 0;
    let minDLon = Infinity;
    for (let c = 0; c < 8; c++) {
      const d = Math.abs(cell.longitude - GRID_LONS[c]);
      if (d < minDLon) {
        minDLon = d;
        bestC = c;
      }
    }

    matrix[bestR][bestC] = cell.value ?? 0;
  }

  return matrix;
}

/**
 * Samples continuous concentration at any (lat, lon) coordinate via bilinear interpolation.
 */
export function sampleBilinearConcentration(
  lat: number,
  lon: number,
  matrix: number[][]
): number | null {
  const { south, west, north, east } = CORRIDOR_ENVELOPE;
  if (lat < south || lat > north || lon < west || lon > east) {
    return null; // Outside dataset footprint
  }

  // Find bounding row indices in GRID_LATS (ascending south to north)
  let r0 = 0;
  while (r0 < 7 && GRID_LATS[r0 + 1] <= lat) {
    r0++;
  }
  const r1 = Math.min(7, r0 + 1);

  // Find bounding col indices in GRID_LONS (ascending west to east)
  let c0 = 0;
  while (c0 < 7 && GRID_LONS[c0 + 1] <= lon) {
    c0++;
  }
  const c1 = Math.min(7, c0 + 1);

  const lat0 = GRID_LATS[r0];
  const lat1 = GRID_LATS[r1];
  const lon0 = GRID_LONS[c0];
  const lon1 = GRID_LONS[c1];

  const u = lon1 === lon0 ? 0 : Math.max(0, Math.min(1, (lon - lon0) / (lon1 - lon0)));
  const v = lat1 === lat0 ? 0 : Math.max(0, Math.min(1, (lat - lat0) / (lat1 - lat0)));

  const v00 = matrix[r0][c0];
  const v01 = matrix[r0][c1];
  const v10 = matrix[r1][c0];
  const v11 = matrix[r1][c1];

  const val = (1 - u) * (1 - v) * v00 + u * (1 - v) * v01 + (1 - u) * v * v10 + u * v * v11;
  return Math.round(val * 10) / 10;
}

/**
 * Smooth cartographic envelope feathering factor [0..1] with softly rounded corners.
 * Softens the perimeter boundary without producing a harsh square or looking like an atmospheric wall.
 */
export function roundedEnvelopeFactor(
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadius = 24,
  featherWidth = 14
): number {
  const dx = Math.min(x, width - 1 - x);
  const dy = Math.min(y, height - 1 - y);

  if (dx < 0 || dy < 0) return 0.0;

  // In the corner regions
  if (dx < cornerRadius && dy < cornerRadius) {
    const cornerDx = cornerRadius - dx;
    const cornerDy = cornerRadius - dy;
    const distToCornerCenter = Math.sqrt(cornerDx * cornerDx + cornerDy * cornerDy);
    const borderDist = cornerRadius - distToCornerCenter;
    if (borderDist <= 0) return 0.0;
    if (borderDist >= featherWidth) return 1.0;
    const t = borderDist / featherWidth;
    return t * t * (3 - 2 * t);
  }

  // Along straight edges
  const edgeDist = Math.min(dx, dy);
  if (edgeDist >= featherWidth) return 1.0;
  if (edgeDist <= 0) return 0.0;
  const t = edgeDist / featherWidth;
  return t * t * (3 - 2 * t);
}

// In-memory raster URL cache to eliminate regeneration lag during 72-month playback
const rasterUrlCache = new Map<string, string>();

/**
 * Clears the in-memory raster cache (useful for test isolation).
 */
export function clearRasterCache(): void {
  rasterUrlCache.clear();
}

/**
 * Generates an interpolated high-resolution canvas raster data URL (256x256).
 * Uses in-memory caching for zero-latency frame transitions during animation playback.
 */
export function generateInterpolatedRasterDataUrl(
  cells: GridCellRecord[],
  pollutant: EnvironmentalPollutant,
  canvasWidth = 256,
  canvasHeight = 256
): string {
  if (typeof document === 'undefined') {
    return ''; // SSR / non-browser fallback
  }

  // Compute robust cache key using pollutant and full cell values to ensure local edits invalidate cache
  const cellsSignature = cells.map((c) => `${c.grid_id}:${c.value}`).join(';');
  const cacheKey = `${pollutant}_${cells.length}_${cellsSignature}`;
  const cached = rasterUrlCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const matrix = buildGridMatrix(cells);
  const imgData = ctx.createImageData(canvasWidth, canvasHeight);
  const data = imgData.data;

  const { south, north, west, east } = CORRIDOR_ENVELOPE;

  for (let y = 0; y < canvasHeight; y++) {
    // In canvas, y=0 is north (top), y=height is south (bottom)
    const lat = north - (y / (canvasHeight - 1)) * (north - south);

    for (let x = 0; x < canvasWidth; x++) {
      const lon = west + (x / (canvasWidth - 1)) * (east - west);
      const val = sampleBilinearConcentration(lat, lon, matrix) ?? 0;
      const { r, g, b } = interpolateRampColor(val, pollutant);
      const feather = roundedEnvelopeFactor(x, y, canvasWidth, canvasHeight, 22, 14);

      const idx = (y * canvasWidth + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      // Alpha: maximum opacity 235 (out of 255) scaled by edge feathering
      data[idx + 3] = Math.round(235 * feather);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const url = canvas.toDataURL('image/png');
  rasterUrlCache.set(cacheKey, url);
  return url;
}
