import { memo, useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { Route } from '../../services/api';
import { routeToGeoJSON } from '../../lib/geo';
import { useAnimatedRoute } from '../../hooks/useAnimatedRoute';
import { ROUTE_COLORS_ARRAY } from './mapStyles';

/** Dedicated colours for alternative route types */
const ALT_COLORS: Record<string, string> = {
  eco: '#F59E0B',    // amber
  scenic: '#06B6D4', // cyan
};

interface RouteLayerProps {
  routes: Route[];
  highlightIndex?: number;
  posLookup: Record<string, [number, number]> | null;
  animate?: boolean;
}

const EMPTY_LINE: GeoJSON.Feature<GeoJSON.LineString> = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: [[0, 0], [0, 0]] },
};

export const RouteLayer = memo(function RouteLayer({
  routes,
  highlightIndex,
  posLookup,
  animate = true,
}: RouteLayerProps) {
  if (!posLookup || routes.length === 0) return null;

  const hiIdx = highlightIndex ?? 0;

  // Convert all routes to GeoJSON
  const routeGeoJSONs = useMemo(
    () => routes.map((r) => {
      // Use pre-computed GeoJSON from backend if available
      if (r.geojson?.geometry?.coordinates?.length) {
        return {
          type: 'Feature' as const,
          properties: {},
          geometry: r.geojson.geometry,
        } as GeoJSON.Feature<GeoJSON.LineString>;
      }
      // Fallback to posLookup conversion
      return routeToGeoJSON(r, posLookup!);
    }),
    [routes, posLookup],
  );

  // Extract full coords for highlighted route
  const highlightedCoords = useMemo(() => {
    const geojson = routeGeoJSONs[hiIdx];
    if (!geojson) return null;
    return geojson.geometry.coordinates as [number, number][];
  }, [routeGeoJSONs, hiIdx]);

  // Animate highlighted route
  const animatedCoords = useAnimatedRoute(
    animate ? highlightedCoords : null,
    2000,
  );

  // Build animated GeoJSON for highlighted route
  const animatedGeoJSON = useMemo<GeoJSON.Feature<GeoJSON.LineString>>(() => {
    const coords = animate ? animatedCoords : (highlightedCoords ?? []);
    if (coords.length < 2) return EMPTY_LINE;
    return {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: coords },
    };
  }, [animate, animatedCoords, highlightedCoords]);

  return (
    <>
      {/* ── Non-highlighted routes: dashed, muted ─────── */}
      {routes.map((r, idx) => {
        if (idx === hiIdx) return null;
        if (idx > 2) return null; // max 3 routes displayed
        // Choose colour based on route type label
        const color = ALT_COLORS[r.route_type ?? ''] ?? ROUTE_COLORS_ARRAY[idx % ROUTE_COLORS_ARRAY.length];
        const geojson = routeGeoJSONs[idx];
        if (!geojson) return null;

        return (
          <Source
            key={`route-alt-${idx}`}
            id={`route-alt-${idx}`}
            type="geojson"
            data={geojson}
          >
            {/* Alt glow */}
            <Layer
              id={`route-alt-glow-${idx}`}
              type="line"
              paint={{
                'line-color': color,
                'line-width': 10,
                'line-opacity': 0.15,
                'line-blur': 6,
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
            <Layer
              id={`route-alt-line-${idx}`}
              type="line"
              paint={{
                'line-color': color,
                'line-width': 2.5,
                'line-opacity': 0.5,
                'line-dasharray': [4, 3],
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </Source>
        );
      })}

      {/* ── Highlighted route: outer glow ─────────────── */}
      <Source
        id="route-highlight-glow"
        type="geojson"
        data={animatedGeoJSON}
      >
        <Layer
          id="route-highlight-glow-layer"
          type="line"
          paint={{
            'line-color': '#10b981',
            'line-width': 14,
            'line-opacity': 0.2,
            'line-blur': 8,
          }}
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        />
      </Source>

      {/* ── Highlighted route: core line ──────────────── */}
      <Source
        id="route-highlight-core"
        type="geojson"
        data={animatedGeoJSON}
      >
        <Layer
          id="route-highlight-core-layer"
          type="line"
          paint={{
            'line-color': '#10b981',
            'line-width': 3,
            'line-opacity': 0.9,
          }}
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        />
      </Source>

      {/* ── Highlighted route: energy gradient overlay ── */}
      <Source
        id="route-highlight-energy"
        type="geojson"
        data={animatedGeoJSON}
        lineMetrics={true}
      >
        <Layer
          id="route-highlight-energy-layer"
          type="line"
          paint={{
            'line-width': 4,
            'line-gradient': [
              'interpolate',
              ['linear'],
              ['line-progress'],
              0, '#10b981',
              0.4, '#f59e0b',
              0.8, '#ef4444',
              1, '#dc2626',
            ],
          }}
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        />
      </Source>
    </>
  );
});