import { memo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { LineLayerSpecification } from '@maplibre/maplibre-gl-style-spec';

interface NetworkEdgesLayerProps {
  edgesGeoJSON: GeoJSON.FeatureCollection<GeoJSON.LineString> | null;
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

const edgesLayerStyle = (): LineLayerSpecification => ({
  id: 'edges-layer',
  type: 'line',
  source: 'network-edges',
  paint: {
    'line-color': 'rgba(255, 255, 255, 0.08)',
    'line-width': 1,
    'line-opacity': 0.18,
  },
  layout: {
    'line-cap': 'round',
    'line-join': 'round',
  },
});

const edgesHoverStyle = (): LineLayerSpecification => ({
  id: 'edges-hover',
  type: 'line',
  source: 'network-edges',
  filter: ['==', ['get', 'source'], -1],
  paint: {
    'line-color': '#10B981',
    'line-width': 2.5,
    'line-opacity': 0.6,
  },
});

export const NetworkEdgesLayer = memo(function NetworkEdgesLayer({
  edgesGeoJSON,
}: NetworkEdgesLayerProps) {
  if (!edgesGeoJSON) return null;

  return (
    <Source id="network-edges" type="geojson" data={edgesGeoJSON}>
      <Layer {...edgesHitArea} />
      <Layer {...edgesLayerStyle()} />
      <Layer {...edgesHoverStyle()} />
    </Source>
  );
});
