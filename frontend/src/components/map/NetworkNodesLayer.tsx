import { memo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { CircleLayerSpecification } from 'maplibre-gl';

interface NetworkNodesLayerProps {
  nodesGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Point> | null;
}

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
  paint: {
    'circle-radius': ['case', ['get', 'isCharging'], 7, 3.5] as any,
    'circle-color': ['case', ['get', 'isCharging'], '#f59e0b', '#10b981'] as any,
    'circle-opacity': ['case', ['get', 'isCharging'], 0.95, 0.7] as any,
    'circle-stroke-width': ['case', ['get', 'isCharging'], 2, 1] as any,
    'circle-stroke-color': ['case', ['get', 'isCharging'], '#92400e', '#065f46'] as any,
  },
};

export const NetworkNodesLayer = memo(function NetworkNodesLayer({
  nodesGeoJSON,
}: NetworkNodesLayerProps) {
  if (!nodesGeoJSON) return null;

  return (
    <Source id="network-nodes" type="geojson" data={nodesGeoJSON}>
      <Layer {...pulseStyle} />
      <Layer {...nodesStyle} />
    </Source>
  );
});
