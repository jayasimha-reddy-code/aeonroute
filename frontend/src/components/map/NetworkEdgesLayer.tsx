import { memo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { LineLayerSpecification } from 'maplibre-gl';

interface NetworkEdgesLayerProps {
  edgesGeoJSON: GeoJSON.FeatureCollection<GeoJSON.LineString> | null;
  isDarkMode: boolean;
}

const edgesHitArea: LineLayerSpecification = {
  id: 'edges-hit-area',
  type: 'line',
  source: 'network-edges',
  paint: {
    'line-color': 'transparent',
    'line-width': 10,
    'line-opacity': 0,
  },
};

const edgesLayerStyle = (isDark: boolean): LineLayerSpecification => ({
  id: 'edges-layer',
  type: 'line',
  source: 'network-edges',
  paint: {
    'line-color': isDark ? '#475569' : '#cbd5e1',
    'line-width': 1.2,
    'line-opacity': 0.18,
  },
  layout: {
    'line-cap': 'round',
    'line-join': 'round',
  },
});

const edgesHoverStyle = (isDark: boolean): LineLayerSpecification => ({
  id: 'edges-hover',
  type: 'line',
  source: 'network-edges',
  filter: ['==', ['get', 'source'], -1],
  paint: {
    'line-color': isDark ? '#818cf8' : '#6366f1',
    'line-width': 3,
    'line-opacity': 0.8,
  },
});

export const NetworkEdgesLayer = memo(function NetworkEdgesLayer({
  edgesGeoJSON,
  isDarkMode,
}: NetworkEdgesLayerProps) {
  if (!edgesGeoJSON) return null;

  return (
    <Source id="network-edges" type="geojson" data={edgesGeoJSON}>
      <Layer {...edgesHitArea} />
      <Layer {...edgesLayerStyle(isDarkMode)} />
      <Layer {...edgesHoverStyle(isDarkMode)} />
    </Source>
  );
});
