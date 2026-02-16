import { memo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { LineLayerSpecification } from 'maplibre-gl';

interface NetworkEdgesLayerProps {
  edgesGeoJSON: GeoJSON.FeatureCollection<GeoJSON.LineString> | null;
  isDarkMode: boolean;
}

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

export const NetworkEdgesLayer = memo(function NetworkEdgesLayer({
  edgesGeoJSON,
  isDarkMode,
}: NetworkEdgesLayerProps) {
  if (!edgesGeoJSON) return null;

  return (
    <Source id="network-edges" type="geojson" data={edgesGeoJSON}>
      <Layer {...edgesLayerStyle(isDarkMode)} />
    </Source>
  );
});
