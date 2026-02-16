import type { StyleSpecification } from 'maplibre-gl';

// ─── Online tile styles (require network access to CartoDB CDN) ──────────────

/** CartoDB dark raster tiles — free, no API key */
export const DARK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'carto-tiles': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    },
  },
  layers: [{ id: 'carto-tiles', type: 'raster', source: 'carto-tiles' }],
};

/** CartoDB light raster tiles — same source ID for seamless styleDiffing */
export const LIGHT_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'carto-tiles': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    },
  },
  layers: [{ id: 'carto-tiles', type: 'raster', source: 'carto-tiles' }],
};

// ─── Offline fallback styles (no external tile sources) ──────────────────────
//
// Strategy: When the map cannot reach CartoDB CDN (e.g. air-gapped demo,
// conference Wi-Fi, or offline laptop), these styles render a solid background
// so the GeoJSON route/node layers still display correctly on top.
// The map is still interactive (pan/zoom) — only the basemap tiles are missing.

/** Offline dark fallback — solid #1a1a2e background, no tile sources */
export const DARK_OFFLINE_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'offline-background',
      type: 'background',
      paint: { 'background-color': '#1a1a2e' },
    },
  ],
};

/** Offline light fallback — solid #e8e8e8 background, no tile sources */
export const LIGHT_OFFLINE_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'offline-background',
      type: 'background',
      paint: { 'background-color': '#e8e8e8' },
    },
  ],
};

/**
 * Select the appropriate map style for a given theme and connectivity state.
 *
 * @param theme  - 'dark' or 'light'
 * @param offline - true to use the no-network fallback style (default: false)
 */
export function getMapStyle(
  theme: 'dark' | 'light',
  offline = false,
): StyleSpecification {
  if (offline) {
    return theme === 'dark' ? DARK_OFFLINE_STYLE : LIGHT_OFFLINE_STYLE;
  }
  return theme === 'dark' ? DARK_STYLE : LIGHT_STYLE;
}

/** Route colors matching the original palette */
export const ROUTE_COLORS = [
  '#10b981',
  '#6366f1',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
];
