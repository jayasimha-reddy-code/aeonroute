import { memo, useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { Route } from '../../services/api';
import { routeToGeoJSON } from '../../lib/geo';
import { useAnimatedRoute } from '../../hooks/useAnimatedRoute';
import { ROUTE_COLORS, ROUTE_COLORS_ARRAY } from './mapStyles';

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
    () => routes.map((r) => routeToGeoJSON(r, posLookup)),
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
      {routes.map((_, idx) => {
        if (idx === hiIdx) return null;
        if (idx > 2) return null; // max 3 routes displayed
        const color = ROUTE_COLORS_ARRAY[idx % ROUTE_COLORS_ARRAY.length];
        const geojson = routeGeoJSONs[idx];
        if (!geojson) return null;

        return (
          <Source
            key={`route-alt-${idx}`}
            id={`route-alt-${idx}`}
            type="geojson"
            data={geojson}
          >
            <Layer
              id={`route-alt-line-${idx}`}
              type="line"
              paint={{
                'line-color': color,
                'line-width': 2,
                'line-opacity': 0.35,
                'line-dasharray': [3, 3],
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </Source>
        );
      })}

      {/* ── Highlighted route: glow underlay ──────────── */}
      <Source
        id="route-highlight-glow"
        type="geojson"
        data={animatedGeoJSON}
      >
        <Layer
          id="route-highlight-glow-layer"
          type="line"
          paint={{
            'line-color': ROUTE_COLORS.glow,
            'line-width': 14,
            'line-opacity': 0.4,
            'line-blur': 8,
          }}
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        />
      </Source>

      {/* ── Highlighted route: energy gradient ────────── */}
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