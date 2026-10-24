import { useEffect, useState } from 'react';
import { useMap, TileLayer } from 'react-leaflet';
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
  CARTO_FALLBACK_ATTRIBUTION,
} from '../lib/mapConfig';

export { OPENFREEMAP_LIBERTY_STYLE, CARTO_FALLBACK_URL };

interface OpenFreeMapLayerProps {
  styleUrl?: string;
  fallbackRasterUrl?: string;
}

/**
 * OpenFreeMap vector basemap layer for Leaflet.
 * Uses MapLibre GL Leaflet bridge to render the public OpenFreeMap Liberty vector style.
 * Falls back to CartoDB Light raster tiles if WebGL or vector style loading fails.
 */
export function OpenFreeMapLayer({
  styleUrl = OPENFREEMAP_LIBERTY_STYLE,
  fallbackRasterUrl = CARTO_FALLBACK_URL,
}: OpenFreeMapLayerProps) {
  const map = useMap();
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    // If fallback is already triggered or window has no WebGL support
    if (useFallback) return;

    // Check WebGL availability before attempting MapLibre initialization
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        console.warn('[RailAir] WebGL unavailable in current environment. Using CartoDB raster fallback.');
        setUseFallback(true);
        return;
      }
    } catch {
      setUseFallback(true);
      return;
    }

    let glLayer: L.MaplibreGL | null = null;
    try {
      if (typeof (L as unknown as { maplibreGL?: unknown }).maplibreGL !== 'function') {
        console.warn('[RailAir] L.maplibreGL plugin not detected. Using CartoDB raster fallback.');
        setUseFallback(true);
        return;
      }

      glLayer = (L as unknown as { maplibreGL: (options: unknown) => L.MaplibreGL }).maplibreGL({
        style: styleUrl,
        interactive: false,
        attribution: OPENFREEMAP_ATTRIBUTION,
      });

      glLayer.addTo(map);

      // Listen for MapLibre runtime load / error events
      const mlMap = glLayer.getMaplibreMap();
      if (mlMap) {
        mlMap.on('error', (e: { error?: { status?: number; message?: string } }) => {
          if (e?.error?.status === 404 || e?.error?.message?.includes('Failed to fetch')) {
            console.warn('[RailAir] OpenFreeMap tile endpoint error. Triggering raster fallback.');
            setUseFallback(true);
          }
        });
      }
    } catch (err) {
      console.warn('[RailAir] MapLibre GL initialization error. Triggering raster fallback:', err);
      setUseFallback(true);
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
  }, [map, styleUrl, useFallback]);

  if (useFallback) {
    return (
      <TileLayer
        url={fallbackRasterUrl}
        attribution={CARTO_FALLBACK_ATTRIBUTION}
        maxZoom={18}
        subdomains="abcd"
      />
    );
  }

  return null;
}
