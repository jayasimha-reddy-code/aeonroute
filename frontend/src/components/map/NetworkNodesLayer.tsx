import { memo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { CircleLayerSpecification } from '@maplibre/maplibre-gl-style-spec';

interface NetworkNodesLayerProps {
  nodesGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Point> | null;
}

/* Subtle glow ring — only for charging stations */
const nodeGlowStyle: CircleLayerSpecification = {
  id: 'nodes-glow',
  type: 'circle',
  source: 'network-nodes',
  filter: ['==', ['get', 'isCharging'], true],
  paint: {
    'circle-radius': 12,
    'circle-color': '#f59e0b',
    'circle-opacity': 0.12,
    'circle-blur': 0.6,
  },
};

const pulseStyle: CircleLayerSpecification = {
  id: 'nodes-pulse',
  type: 'circle',
  source: 'network-nodes',
  filter: ['==', ['get', 'isCharging'], true],
  paint: {
    'circle-radius': 14,
    'circle-color': '#f59e0b',
    'circle-opacity': 0.15,
    'circle-stroke-width': 1,
    'circle-stroke-color': '#f59e0b',
    'circle-stroke-opacity': 0.3,
  },
};

const nodesStyle: CircleLayerSpecification = {
  id: 'nodes-layer',
  type: 'circle',
  source: 'network-nodes',
  filter: ['==', ['get', 'isCharging'], true],
  paint: {
    'circle-radius': 7,
    'circle-color': '#f59e0b',
    'circle-opacity': 0.95,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#92400e',
    'circle-stroke-opacity': 1,
  },
};

export const NetworkNodesLayer = memo(function NetworkNodesLayer({
  nodesGeoJSON,
}: NetworkNodesLayerProps) {
  if (!nodesGeoJSON) return null;

  return (
    <Source id="network-nodes" type="geojson" data={nodesGeoJSON}>
      <Layer {...nodeGlowStyle} />
      <Layer {...pulseStyle} />
      <Layer {...nodesStyle} />
    </Source>
  );
});
