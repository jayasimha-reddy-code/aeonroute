import type { StyleSpecification } from 'maplibre-gl';

// CartoDB Dark Matter — ultra-dark tiles
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

// Offline fallback — solid midnight
export const DARK_OFFLINE_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'offline-background',
      type: 'background',
      paint: { 'background-color': '#0a0f16' },
    },
  ],
};

// Route colors — neon accent palette
export const ROUTE_COLORS = {
  primary: '#10B981',    // emerald
  alt1: '#14B8A6',       // cyan/teal
  alt2: '#F59E0B',       // amber
  alt3: '#3B82F6',       // blue
  alt4: '#EF4444',       // rose
  glow: 'rgba(16, 185, 129, 0.25)',  // emerald glow underlay
};

// Legacy array access for components that index by route number
export const ROUTE_COLORS_ARRAY = [
  ROUTE_COLORS.primary,
  ROUTE_COLORS.alt1,
  ROUTE_COLORS.alt2,
  ROUTE_COLORS.alt3,
  ROUTE_COLORS.alt4,
];

// Always return dark
export function getMapStyle(_theme?: string, offline = false): StyleSpecification {
  return offline ? DARK_OFFLINE_STYLE : DARK_STYLE;
}
