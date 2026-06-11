import { memo, useRef, useMemo, useCallback, useState, useEffect } from 'react';
import Map, { NavigationControl, Popup, Marker } from 'react-map-gl/maplibre';
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import { LngLatBounds } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Zap } from 'lucide-react';

import type { RoadNetworkData, Route } from '../../../services/api';
import { useMapTheme } from '../../../hooks/useMapTheme';
import { networkToGeoJSON, buildPosLookup, HYDERABAD_CENTER } from '../../../lib/geo';
import { NetworkEdgesLayer } from './NetworkEdgesLayer';
import { NetworkNodesLayer } from './NetworkNodesLayer';
import { NodeMarkers } from './NodeMarkers';
import { RouteLayer } from './RouteLayer';
import { RouteLegend } from './RouteLegend';
import { EVMarker } from './EVMarker';
import { ChargingOverlay } from './ChargingOverlay';
import { StationMarkers } from './StationMarkers';

export interface MapViewProps {
  network: RoadNetworkData | null;
  routes?: Route[];
  highlightIndex?: number;
  sourceNode?: number;
  destNode?: number;
  className?: string;
  /** Centre [lat, lng] — kept for backward compatibility */
  center?: [number, number];
  zoom?: number;
  onNodeClick?: (nodeId: number) => void;
  onRouteSelect?: (idx: number) => void;
  simulationState?: {
    isSimulating: boolean;
    currentPosition: [number, number] | null;
    currentBearing: number;
    isCharging: boolean;
    chargingProgress: number;
  };
  routeMode?: 'fast' | 'eco' | 'scenic' | 'dijkstra' | 'astar' | 'q_learning' | 'dqn' | 'gnn' | 'hybrid';
  children?: React.ReactNode;
}

interface HoverInfo {
  lng: number;
  lat: number;
  nodeId: number;
  isCharging: boolean;
  degree: number;
}

interface EdgeHoverInfo {
  lng: number;
  lat: number;
  source: number;
  target: number;
  distance_km: number;
  energy_per_km: number;
  time_minutes: number;
  road_type: string;
}

const MapView = memo(function MapView({
  network,
  routes = [],
  highlightIndex,
  sourceNode,
  destNode,
  className = '',
  center = HYDERABAD_CENTER,
  zoom = 12,
  onNodeClick,
  onRouteSelect,
  simulationState,
  routeMode = 'fast',
  children,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const { mapStyle } = useMapTheme();
  const [cursor, setCursor] = useState('auto');
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [edgeHoverInfo, setEdgeHoverInfo] = useState<EdgeHoverInfo | null>(null);
  const [selectedInjectedStop, setSelectedInjectedStop] = useState<{
    lng: number; lat: number; name: string; soc_at_arrival: number; charge_to_soc: number; charging_time_minutes: number;
  } | null>(null);

  // Collect injected charging stops from all routes
  const injectedStops = useMemo(() => {
    const stops: Array<{ lng: number; lat: number; name: string; soc_at_arrival: number; charge_to_soc: number; charging_time_minutes: number }> = [];
    for (const route of routes) {
      if (route.charging_stop_details) {
        for (const s of route.charging_stop_details) {
          if (s.injected) stops.push({ lng: s.lon, lat: s.lat, name: s.name, soc_at_arrival: s.soc_at_arrival, charge_to_soc: s.charge_to_soc, charging_time_minutes: s.charging_time_minutes });
        }
      }
    }
    return stops;
  }, [routes]);

  // ── Derived geo data ──────────────────────────────────
  const posLookup = useMemo(
    () => (network ? buildPosLookup(network, center) : null),
    [network, center],
  );

  const { nodesGeoJSON, edgesGeoJSON } = useMemo(() => {
    if (!network) return { nodesGeoJSON: null, edgesGeoJSON: null };
    return networkToGeoJSON(network, center);
  }, [network, center]);

  // ── Interaction handlers ──────────────────────────────
  const handleClick = useCallback(
    (evt: MapLayerMouseEvent) => {
      const feature = evt.features?.[0];
      if (!feature) return;
      if (feature.layer?.id === 'nodes-layer' && feature.properties?.nodeId != null && onNodeClick) {
        onNodeClick(feature.properties.nodeId as number);
      }
      if (feature.layer?.id === 'edges-hit-area' && feature.properties?.source != null) {
        setEdgeHoverInfo({
          lng: evt.lngLat.lng,
          lat: evt.lngLat.lat,
          source: feature.properties.source as number,
          target: feature.properties.target as number,
          distance_km: (feature.properties.distance_km as number) ?? 0,
          energy_per_km: (feature.properties.energy_per_km as number) ?? 0,
          time_minutes: (feature.properties.time_minutes as number) ?? 0,
          road_type: (feature.properties.road_type as string) ?? 'unknown',
        });
      }
    },
    [onNodeClick],
  );

  const handleMouseMove = useCallback((evt: MapLayerMouseEvent) => {
    const feature = evt.features?.[0];
    if (feature?.properties && feature.layer?.id === 'nodes-layer') {
      setHoverInfo({
        lng: evt.lngLat.lng,
        lat: evt.lngLat.lat,
        nodeId: feature.properties.nodeId as number,
        isCharging: !!feature.properties.isCharging,
        degree: (feature.properties.degree as number) ?? 0,
      });
      setCursor('pointer');
    } else if (feature?.layer?.id === 'edges-hit-area') {
      setCursor('pointer');
      setHoverInfo(null);
    } else {
      setHoverInfo(null);
      setCursor('auto');
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverInfo(null);
    setCursor('auto');
  }, []);

  // ── Fit bounds to routes (use GeoJSON coords when available) ──
  useEffect(() => {
    if (!mapRef.current || routes.length === 0) return;
    const bounds = new LngLatBounds();
    let hasCoord = false;
    for (const route of routes) {
      // Prefer GeoJSON coordinates (full street geometry)
      const coords = route.geojson?.geometry?.coordinates;
      if (coords && coords.length > 0) {
        for (const c of coords) {
          bounds.extend(c as [number, number]);
          hasCoord = true;
        }
      } else if (posLookup) {
        // Fallback to node lookup
        for (const nodeId of route.path) {
          const coord = posLookup[nodeId.toString()];
          if (coord) { bounds.extend(coord); hasCoord = true; }
        }
      }
    }
    if (hasCoord && !bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, { padding: 60, duration: 600 });
    }
  }, [routes, posLookup]);

  // ── Fit bounds to network data (Hyderabad auto-center) ──
  useEffect(() => {
    if (!mapRef.current || !network?.bounds) return;
    const { north, south, east, west } = network.bounds;
    const bounds = new LngLatBounds([west, south], [east, north]);
    mapRef.current.fitBounds(bounds, { padding: 40, duration: 800 });
  }, [network?.bounds]);

  // ── Determine source / dest from routes or props ──────
  const srcNodeId = routes.length > 0 ? routes[0].path[0] : sourceNode;
  const dstNodeId =
    routes.length > 0 ? routes[0].path[routes[0].path.length - 1] : destNode;

  return (
    <div
      className={`w-full h-full rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] ${className}`}
      style={{ minHeight: 300 }}
      role="application"
      aria-label="EV route map"
      aria-roledescription="Interactive map"
    >
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: center[1],
          latitude: center[0],
          zoom,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        interactiveLayerIds={['nodes-layer', 'edges-hit-area']}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        cursor={cursor}
      >
        <NavigationControl position="top-right" />

        {/* Network edges */}
        <NetworkEdgesLayer edgesGeoJSON={edgesGeoJSON} />

        {/* Network nodes (rendered on GPU as circles) */}
        <NetworkNodesLayer nodesGeoJSON={nodesGeoJSON} />

        {/* Route visualization (animated, gradient) */}
        <RouteLayer
          routes={routes}
          highlightIndex={highlightIndex}
          posLookup={posLookup}
          routeMode={routeMode}
        />

        {/* Source / Destination markers */}
        <NodeMarkers
          sourceNodeId={srcNodeId}
          destNodeId={dstNodeId}
          posLookup={posLookup}
        />

        {/* EV Charging Station markers */}
        <StationMarkers
          routeStationIds={routes.length > 0 ? (routes[0].charging_stops ?? []) : []}
        />

        {/* Injected charging stop markers (auto-added by range anxiety logic) */}
        {injectedStops.map((stop, idx) => (
          <Marker key={`injected-${idx}`} longitude={stop.lng} latitude={stop.lat} anchor="center">
            <button
              title={`Auto Charging Stop — ${stop.name}`}
              onClick={() => setSelectedInjectedStop(stop)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <div style={{ position: 'relative', width: 28, height: 28 }}>
                {/* Pulsing ring */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'rgba(251,191,36,0.25)', animation: 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite',
                }} />
                {/* Core */}
                <div style={{
                  position: 'absolute', inset: 4, borderRadius: '50%',
                  background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, boxShadow: '0 0 10px rgba(245,158,11,0.7)',
                }}>⚡</div>
              </div>
            </button>
          </Marker>
        ))}

        {/* Popup for selected injected stop */}
        {selectedInjectedStop && (
          <Popup
            longitude={selectedInjectedStop.lng}
            latitude={selectedInjectedStop.lat}
            closeButton={true}
            onClose={() => setSelectedInjectedStop(null)}
            anchor="bottom"
            offset={18}
          >
            <div className="text-xs space-y-1 min-w-[180px]">
              <p className="font-semibold text-amber-500">⚡ Auto Charging Stop</p>
              <p className="font-medium">{selectedInjectedStop.name}</p>
              <p className="text-muted">Arrive at {selectedInjectedStop.soc_at_arrival.toFixed(0)}% → Charge to {selectedInjectedStop.charge_to_soc}%</p>
              <p className="text-muted">{selectedInjectedStop.charging_time_minutes} min charging</p>
            </div>
          </Popup>
        )}

        {/* EV Simulation overlay */}
        {simulationState?.isSimulating && (
          <>
            <EVMarker
              position={simulationState.currentPosition}
              bearing={simulationState.currentBearing}
              isCharging={simulationState.isCharging}
            />
            <ChargingOverlay
              isCharging={simulationState.isCharging}
              chargingProgress={simulationState.chargingProgress}
              position={simulationState.currentPosition}
            />
          </>
        )}

        {/* Node hover popup */}
        {hoverInfo && (
          <Popup
            longitude={hoverInfo.lng}
            latitude={hoverInfo.lat}
            closeButton={false}
            anchor="bottom"
            offset={10}
          >
            <div className="text-xs space-y-1 min-w-[120px]">
              <p className="font-semibold">Node {hoverInfo.nodeId}</p>
              {hoverInfo.isCharging && (
                <p className="text-amber-500 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Charging Station
                </p>
              )}
              <p className="text-muted">Connections: {hoverInfo.degree}</p>
            </div>
          </Popup>
        )}

        {/* Edge click popup */}
        {edgeHoverInfo && (
          <Popup
            longitude={edgeHoverInfo.lng}
            latitude={edgeHoverInfo.lat}
            closeButton={true}
            onClose={() => setEdgeHoverInfo(null)}
            anchor="bottom"
            offset={12}
          >
            <div className="text-xs space-y-1.5 min-w-[140px]">
              <p className="font-semibold">Edge {edgeHoverInfo.source} → {edgeHoverInfo.target}</p>
              <div className="space-y-0.5 text-label">
                <p>Distance: {edgeHoverInfo.distance_km.toFixed(2)} km</p>
                <p>Energy: {edgeHoverInfo.energy_per_km.toFixed(3)} kWh/km</p>
                <p>Time: {edgeHoverInfo.time_minutes.toFixed(1)} min</p>
                <p>Type: {edgeHoverInfo.road_type}</p>
              </div>
            </div>
          </Popup>
        )}

        {/* Extension slot */}
        {children}
      </Map>

      {/* Route legend overlay (HTML, not a map layer) */}
      <RouteLegend
        routes={routes}
        highlightIndex={highlightIndex}
        onRouteSelect={onRouteSelect}
      />
    </div>
  );
});

MapView.displayName = 'MapView';

export default MapView;
