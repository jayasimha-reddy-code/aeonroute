import type { RoadNetworkData, Route } from '../services/api';

/**
 * Convert abstract graph coords (0-100) to [lng, lat] (GeoJSON order).
 * Same math as the old Leaflet toLatLng, but returns [lng, lat].
 */
export function toLngLat(
  x: number,
  y: number,
  center: [number, number] = [30.2672, -97.7431],
  spread = 0.045,
): [number, number] {
  const lat = center[0] + (y / 100 - 0.5) * spread * 2;
  const lng = center[1] + (x / 100 - 0.5) * spread * 2;
  return [lng, lat];
}

/**
 * Build a lookup table: nodeId -> [lng, lat].
 */
export function buildPosLookup(
  network: RoadNetworkData,
  center: [number, number] = [30.2672, -97.7431],
): Record<string, [number, number]> {
  const lookup: Record<string, [number, number]> = {};
  for (const [id, pos] of Object.entries(network.nodes_pos)) {
    lookup[id] = toLngLat(pos.x, pos.y, center);
  }
  return lookup;
}

/**
 * Convert full RoadNetworkData to GeoJSON FeatureCollections for nodes and edges.
 */
export function networkToGeoJSON(
  network: RoadNetworkData,
  center: [number, number] = [30.2672, -97.7431],
) {
  const nodeFeatures: GeoJSON.Feature<GeoJSON.Point>[] = Object.entries(
    network.nodes_pos,
  ).map(([id, pos]) => ({
    type: 'Feature' as const,
    properties: {
      nodeId: parseInt(id),
      isCharging: network.charging_stations.includes(parseInt(id)),
    },
    geometry: {
      type: 'Point' as const,
      coordinates: toLngLat(pos.x, pos.y, center),
    },
  }));

  const edgeFeatures = network.edges_list
    .map((edge) => {
      const from = network.nodes_pos[edge.source.toString()];
      const to = network.nodes_pos[edge.target.toString()];
      if (!from || !to) return null;
      return {
        type: 'Feature' as const,
        properties: {} as Record<string, unknown>,
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            toLngLat(from.x, from.y, center),
            toLngLat(to.x, to.y, center),
          ],
        },
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  return {
    nodesGeoJSON: {
      type: 'FeatureCollection' as const,
      features: nodeFeatures,
    },
    edgesGeoJSON: {
      type: 'FeatureCollection' as const,
      features: edgeFeatures,
    },
  };
}

/**
 * Convert a Route to a GeoJSON Feature LineString.
 * posLookup values are already in [lng, lat] order.
 */
export function routeToGeoJSON(
  route: Route,
  posLookup: Record<string, [number, number]>,
): GeoJSON.Feature<GeoJSON.LineString> {
  const coordinates: [number, number][] = route.path
    .map((nodeId) => posLookup[nodeId.toString()])
    .filter((c): c is [number, number] => c != null);

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates,
    },
  };
}
