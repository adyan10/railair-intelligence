import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import '@maplibre/maplibre-gl-leaflet';
import 'maplibre-gl/dist/maplibre-gl.css';

// Configure MapLibre Web Worker URL explicitly for Vite bundler compatibility
if (typeof window !== 'undefined' && typeof setWorkerUrl === 'function') {
  setWorkerUrl(workerUrl);
}

import {
  OPENFREEMAP_LIBERTY_STYLE,
  CARTO_FALLBACK_URL,
  OPENFREEMAP_ATTRIBUTION,
} from '../lib/mapConfig';

export { OPENFREEMAP_LIBERTY_STYLE, CARTO_FALLBACK_URL };

interface OpenFreeMapLayerProps {
  styleUrl?: string;
  fallbackRasterUrl?: string;
}

/**
 * OpenFreeMap vector basemap layer for Leaflet.
 * Uses MapLibre GL Leaflet bridge to render the public OpenFreeMap Liberty vector style.
 */
export function OpenFreeMapLayer({
  styleUrl = OPENFREEMAP_LIBERTY_STYLE,
}: OpenFreeMapLayerProps) {
  const map = useMap();

  useEffect(() => {
    // Check WebGL availability before attempting MapLibre initialization
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        console.warn('[RailAir] WebGL unavailable in current environment.');
        return;
      }
    } catch {
      return;
    }

    let glLayer: L.MaplibreGL | null = null;
    try {
      if (typeof (L as unknown as { maplibreGL?: unknown }).maplibreGL !== 'function') {
        console.warn('[RailAir] L.maplibreGL plugin not detected.');
        return;
      }

      glLayer = (L as unknown as { maplibreGL: (options: unknown) => L.MaplibreGL }).maplibreGL({
        style: styleUrl,
        interactive: false,
        attribution: OPENFREEMAP_ATTRIBUTION,
      });

      glLayer.addTo(map);
    } catch (err) {
      console.warn('[RailAir] MapLibre GL initialization error:', err);
    }

    return () => {
      if (glLayer && map.hasLayer(glLayer)) {
        try {
          map.removeLayer(glLayer);
        } catch {
          // Ignore unmount teardown warnings
        }
      }
    };
  }, [map, styleUrl]);

  return null;
}

