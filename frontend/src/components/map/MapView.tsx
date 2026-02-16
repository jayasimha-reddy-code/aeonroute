import { memo, useRef, useMemo, useCallback, useState, useEffect } from 'react';
import Map, { Source, Layer, NavigationControl, Popup } from 'react-map-gl/maplibre';
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import { LngLatBounds } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import type { RoadNetworkData, Route } from '../../services/api';
import { useMapTheme } from '../../hooks/useMapTheme';
import { networkToGeoJSON, buildPosLookup, routeToGeoJSON } from '../../lib/geo';
import { ROUTE_COLORS } from './mapStyles';
import { NetworkEdgesLayer } from './NetworkEdgesLayer';
import { NetworkNodesLayer } from './NetworkNodesLayer';
import { NodeMarkers } from './NodeMarkers';

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
  children?: React.ReactNode;
}

interface HoverInfo {
  lng: number;
  lat: number;
  nodeId: number;
  isCharging: boolean;
}

const MapView = memo(function MapView({
  network,
  routes = [],
  highlightIndex,
  sourceNode,
  destNode,
  className = '',
  center = [30.2672, -97.7431],
  zoom = 13,
  onNodeClick,
  children,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const { mapStyle, isDarkMode } = useMapTheme();
  const [cursor, setCursor] = useState('auto');
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  // ── Derived geo data ──────────────────────────────────
  const posLookup = useMemo(
    () => (network ? buildPosLookup(network, center) : null),
    [network, center],
  );

  const { nodesGeoJSON, edgesGeoJSON } = useMemo(() => {
    if (!network) return { nodesGeoJSON: null, edgesGeoJSON: null };
    return networkToGeoJSON(network, center);
  }, [network, center]);

  const routeGeoJSONs = useMemo(
    () =>
      posLookup
        ? routes.map((r) => routeToGeoJSON(r, posLookup))
        : [],
    [routes, posLookup],
  );

  // ── Interaction handlers ──────────────────────────────
  const handleClick = useCallback(
    (evt: MapLayerMouseEvent) => {
      const feature = evt.features?.[0];
      if (feature?.properties?.nodeId != null && onNodeClick) {
        onNodeClick(feature.properties.nodeId as number);
      }
    },
    [onNodeClick],
  );

  const handleMouseMove = useCallback((evt: MapLayerMouseEvent) => {
    const feature = evt.features?.[0];
    if (feature?.properties) {
      setHoverInfo({
        lng: evt.lngLat.lng,
        lat: evt.lngLat.lat,
        nodeId: feature.properties.nodeId as number,
        isCharging: !!feature.properties.isCharging,
      });
      setCursor('pointer');
    } else {
      setHoverInfo(null);
      setCursor('auto');
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverInfo(null);
    setCursor('auto');
  }, []);

  // ── Fit bounds to routes ──────────────────────────────
  useEffect(() => {
    if (!mapRef.current || routes.length === 0 || !posLookup) return;
    const bounds = new LngLatBounds();
    for (const route of routes) {
      for (const nodeId of route.path) {
        const coord = posLookup[nodeId.toString()];
        if (coord) bounds.extend(coord);
      }
    }
    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, { padding: 60, duration: 600 });
    }
  }, [routes, posLookup]);

  // ── Determine source / dest from routes or props ──────
  const srcNodeId = routes.length > 0 ? routes[0].path[0] : sourceNode;
  const dstNodeId =
    routes.length > 0 ? routes[0].path[routes[0].path.length - 1] : destNode;

  return (
    <div
      className={`w-full h-full rounded-2xl overflow-hidden border border-[var(--glass-border)] shadow-card ${className}`}
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
        interactiveLayerIds={['nodes-layer']}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        cursor={cursor}
      >
        <NavigationControl position="top-right" />

        {/* Network edges */}
        <NetworkEdgesLayer edgesGeoJSON={edgesGeoJSON} isDarkMode={isDarkMode} />

        {/* Network nodes (rendered on GPU as circles) */}
        <NetworkNodesLayer nodesGeoJSON={nodesGeoJSON} />

        {/* Route polylines */}
        {routeGeoJSONs.map((geojson, idx) => {
          const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
          const isHighlighted =
            highlightIndex === undefined || highlightIndex === idx;

          return (
            <Source
              key={`route-source-${idx}`}
              id={`route-source-${idx}`}
              type="geojson"
              data={geojson}
            >
              {/* Glow underlay */}
              {isHighlighted && (
                <Layer
                  id={`route-glow-${idx}`}
                  type="line"
                  paint={{
                    'line-color': color,
                    'line-width': 8,
                    'line-opacity': 0.15,
                    'line-blur': 4,
                  }}
                  layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                />
              )}
              {/* Main line */}
              <Layer
                id={`route-main-${idx}`}
                type="line"
                paint={{
                  'line-color': color,
                  'line-width': isHighlighted ? 4 : 2.5,
                  'line-opacity': isHighlighted ? 0.9 : 0.35,
                }}
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              />
            </Source>
          );
        })}

        {/* Source / Destination markers */}
        <NodeMarkers
          sourceNodeId={srcNodeId}
          destNodeId={dstNodeId}
          posLookup={posLookup}
        />

        {/* Hover popup */}
        {hoverInfo && (
          <Popup
            longitude={hoverInfo.lng}
            latitude={hoverInfo.lat}
            closeButton={false}
            anchor="bottom"
            offset={10}
          >
            <div className="text-xs font-medium">
              {hoverInfo.isCharging
                ? `⚡ Charging Station #${hoverInfo.nodeId}`
                : `Node ${hoverInfo.nodeId}`}
            </div>
          </Popup>
        )}

        {/* Extension slot for Plan 02 (RouteLayer, etc.) */}
        {children}
      </Map>
    </div>
  );
});

MapView.displayName = 'MapView';

export default MapView;
