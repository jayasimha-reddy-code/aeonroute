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
  // Compute node degrees from edges
  const degrees: Record<number, number> = {};
  for (const edge of network.edges_list) {
    degrees[edge.source] = (degrees[edge.source] ?? 0) + 1;
    degrees[edge.target] = (degrees[edge.target] ?? 0) + 1;
  }

  const nodeFeatures: GeoJSON.Feature<GeoJSON.Point>[] = Object.entries(
    network.nodes_pos,
  ).map(([id, pos]) => ({
    type: 'Feature' as const,
    properties: {
      nodeId: parseInt(id),
      isCharging: network.charging_stations.includes(parseInt(id)),
      degree: degrees[parseInt(id)] ?? 0,
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
        properties: {
          source: edge.source,
          target: edge.target,
          distance_km: edge.distance_km ?? 0,
          energy_per_km: edge.base_energy_kwh_per_km ?? 0,
          time_minutes: edge.base_time_minutes ?? 0,
          road_type: edge.road_type ?? 'local',
        },
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

// ─── Per-segment metrics ──────────────────────────────

export interface SegmentMetric {
  fromNode: number;
  toNode: number;
  distance_km: number;
  energy_kwh: number;
  time_minutes: number;
  cumulativeDistance_km: number;
  isChargingStop: boolean;
}

/**
 * Compute per-segment distance / energy / time from a Route,
 * distributing totals proportionally by coordinate distance.
 */
export function computeSegmentMetrics(
  route: Route,
  posLookup: Record<string, [number, number]>,
): SegmentMetric[] {
  const segments: SegmentMetric[] = [];
  let totalCoordDistance = 0;

  // First pass: compute coordinate distances for proportional distribution
  const segDistances: number[] = [];
  for (let i = 0; i < route.path.length - 1; i++) {
    const from = posLookup[route.path[i].toString()];
    const to = posLookup[route.path[i + 1].toString()];
    if (!from || !to) {
      segDistances.push(0);
      continue;
    }
    const d = Math.sqrt((to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2);
    segDistances.push(d);
    totalCoordDistance += d;
  }

  // Second pass: proportional metrics
  let cumulativeDistance = 0;
  for (let i = 0; i < route.path.length - 1; i++) {
    const ratio =
      totalCoordDistance > 0
        ? segDistances[i] / totalCoordDistance
        : 1 / (route.path.length - 1);
    const dist = route.distance_km * ratio;
    cumulativeDistance += dist;
    segments.push({
      fromNode: route.path[i],
      toNode: route.path[i + 1],
      distance_km: dist,
      energy_kwh: route.energy_kwh * ratio,
      time_minutes: route.time_minutes * ratio,
      cumulativeDistance_km: cumulativeDistance,
      isChargingStop: route.charging_stops.includes(route.path[i + 1]),
    });
  }
  return segments;
}
