import { describe, it, expect } from 'vitest';
import { HOTSPOTS } from '../data/mock/hotspots';
import fs from 'fs';
import path from 'path';

describe('Hotspots Map Basemap Integration', () => {
  it('contains 7 canonical hotspots along the Meerut-Delhi corridor', () => {
    expect(HOTSPOTS).toHaveLength(7);
    HOTSPOTS.forEach((h) => {
      expect(h.position.lat).toBeGreaterThanOrEqual(28.6);
      expect(h.position.lat).toBeLessThanOrEqual(29.0);
      expect(h.position.lng).toBeGreaterThanOrEqual(77.2);
      expect(h.position.lng).toBeLessThanOrEqual(77.8);
      expect(h.rank).toBeGreaterThanOrEqual(1);
      expect(h.rank).toBeLessThanOrEqual(7);
      expect(['PM2.5', 'PM10']).toContain(h.pollutant);
      expect(['critical', 'high', 'moderate', 'low']).toContain(h.severity);
    });
  });

  it('verifies HotspotsPage uses the shared OpenFreeMapLayer instead of broken CARTO TileLayer', () => {
    const hotspotsPagePath = path.resolve(__dirname, '../pages/HotspotsPage.tsx');
    const content = fs.readFileSync(hotspotsPagePath, 'utf-8');

    // Must import and use OpenFreeMapLayer
    expect(content).toContain("import { OpenFreeMapLayer } from '../components/OpenFreeMapLayer'");
    expect(content).toContain('<OpenFreeMapLayer />');

    // Must not contain direct CARTO tile URL or CARTO attribution
    expect(content).not.toContain('cartocdn.com');
    expect(content).not.toContain('&copy; CARTO');
    // Must not import TileLayer from react-leaflet
    expect(content).not.toMatch(/import\s*\{[^}]*TileLayer[^}]*\}\s*from\s*'react-leaflet'/);
  });
});
