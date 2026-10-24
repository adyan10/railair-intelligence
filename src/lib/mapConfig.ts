/**
 * Map provider configuration and styling endpoints for RailAir Intelligence.
 */

// OpenFreeMap Public Vector Style (hosted, no API key required)
export const OPENFREEMAP_LIBERTY_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

// CartoDB Light Raster Basemap (resilient fallback if WebGL or vector style fails)
export const CARTO_FALLBACK_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

export const OPENFREEMAP_ATTRIBUTION =
  'Map data &copy; <a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors | Track alignment: illustrative';

export const CARTO_FALLBACK_ATTRIBUTION =
  'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, CartoDB (Fallback) | Track alignment: illustrative';
