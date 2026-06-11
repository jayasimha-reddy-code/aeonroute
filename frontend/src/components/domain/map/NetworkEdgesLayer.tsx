import { memo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { LineLayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import { useSimulationScale } from '../../../store/store';

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

/** Edge opacity / color changes with simulationScale:
 * - light    → hidden (opacity 0) — cleaner map
 * - standard → faint white (opacity 0.18)
 * - full     → more visible (opacity 0.35) with highway/residential type coloring
 */
const edgesLayerStyle = (scale: 'light' | 'standard' | 'full'): LineLayerSpecification => {
  if (scale === 'light') {
    return {
      id: 'edges-layer',
      type: 'line',
      source: 'network-edges',
      paint: { 'line-color': 'transparent', 'line-width': 1, 'line-opacity': 0 },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    };
  }
  if (scale === 'full') {
    return {
      id: 'edges-layer',
      type: 'line',
      source: 'network-edges',
      paint: {
        'line-color': [
          'match',
          ['get', 'highway'],
          ['motorway', 'trunk', 'primary'],  '#f59e0b',  // amber — highways
          ['residential', 'living_street'],   '#64748b',  // slate — residential
          'rgba(255, 255, 255, 0.15)',                    // default
        ] as any,
        'line-width': 1.5,
        'line-opacity': 0.35,
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    };
  }
  // standard
  return {
    id: 'edges-layer',
    type: 'line',
    source: 'network-edges',
    paint: {
      'line-color': 'rgba(255, 255, 255, 0.08)',
      'line-width': 1,
      'line-opacity': 0.18,
    },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  };
};

const edgesHoverStyle: LineLayerSpecification = {
  id: 'edges-hover',
  type: 'line',
  source: 'network-edges',
  filter: ['==', ['get', 'source'], -1],
  paint: {
    'line-color': '#10B981',
    'line-width': 2.5,
    'line-opacity': 0.6,
  },
};

export const NetworkEdgesLayer = memo(function NetworkEdgesLayer({
  edgesGeoJSON,
}: NetworkEdgesLayerProps) {
  const simulationScale = useSimulationScale();

  if (!edgesGeoJSON) return null;

  return (
    <Source id="network-edges" type="geojson" data={edgesGeoJSON}>
      <Layer {...edgesHitArea} />
      <Layer {...edgesLayerStyle(simulationScale)} />
      <Layer {...edgesHoverStyle} />
    </Source>
  );
});
