import { memo, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RoadNetworkData, Route } from '../services/api';

interface NetworkMapProps {
  network: RoadNetworkData | null;
  routes?: Route[];
  highlightIndex?: number;
  sourceNode?: number;
  destNode?: number;
  className?: string;
  /** Centre lat/lng — defaults to Austin, TX */
  center?: [number, number];
  zoom?: number;
  onNodeClick?: (nodeId: number) => void;
}

const ROUTE_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'];

// Dark-themed CartoDB tile layer — free, no API key
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

/**
 * Convert the abstract graph coordinates (0-100) to real lat/lng
 * within a bounding box around the given centre.
 */
function toLatLng(
  x: number,
  y: number,
  center: [number, number],
  spread = 0.045, // ~5 km spread
): [number, number] {
  const lat = center[0] + (y / 100 - 0.5) * spread * 2;
  const lng = center[1] + (x / 100 - 0.5) * spread * 2;
  return [lat, lng];
}

const NetworkMap = memo(function NetworkMap({
  network,
  routes = [],
  highlightIndex,
  sourceNode,
  destNode,
  className = '',
  center = [30.2672, -97.7431], // Austin, TX
  zoom = 13,
  onNodeClick,
}: NetworkMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{
    edges: L.LayerGroup;
    routes: L.LayerGroup;
    nodes: L.LayerGroup;
    markers: L.LayerGroup;
  } | null>(null);

  // 1. Initialise the Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true,
    });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 18 }).addTo(map);

    layersRef.current = {
      edges: L.layerGroup().addTo(map),
      routes: L.layerGroup().addTo(map),
      nodes: L.layerGroup().addTo(map),
      markers: L.layerGroup().addTo(map),
    };

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Position lookup memoisation
  const posLookup = useMemo(() => {
    if (!network) return null;
    const lookup: Record<string, [number, number]> = {};
    for (const [id, pos] of Object.entries(network.nodes_pos)) {
      lookup[id] = toLatLng(pos.x, pos.y, center);
    }
    return lookup;
  }, [network, center]);

  // 2. Draw the network edges
  useEffect(() => {
    if (!network || !layersRef.current || !posLookup) return;
    const layer = layersRef.current.edges;
    layer.clearLayers();

    for (const edge of network.edges_list) {
      const from = posLookup[edge.source.toString()];
      const to = posLookup[edge.target.toString()];
      if (!from || !to) continue;

      L.polyline([from, to], {
        color: '#475569',
        weight: 1.2,
        opacity: 0.18,
      }).addTo(layer);
    }
  }, [network, posLookup]);

  // 3. Draw nodes
  useEffect(() => {
    if (!network || !layersRef.current || !posLookup) return;
    const layer = layersRef.current.nodes;
    layer.clearLayers();

    for (const [id, latlng] of Object.entries(posLookup)) {
      const nodeId = parseInt(id);
      const isCharging = network.charging_stations.includes(nodeId);

      if (isCharging) {
        // Animated pulse ring behind the station
        L.circleMarker(latlng, {
          radius: 14,
          fillColor: '#f59e0b',
          fillOpacity: 0.15,
          color: '#f59e0b',
          weight: 1,
          opacity: 0.3,
          className: 'charge-pulse',
        }).addTo(layer);
      }

      const marker = L.circleMarker(latlng, {
        radius: isCharging ? 7 : 3.5,
        fillColor: isCharging ? '#f59e0b' : '#10b981',
        fillOpacity: isCharging ? 0.95 : 0.7,
        color: isCharging ? '#92400e' : '#065f46',
        weight: isCharging ? 2 : 1,
      });

      marker.bindTooltip(
        isCharging ? `⚡ Charging Station #${nodeId}` : `Node ${nodeId}`,
        { direction: 'top', offset: [0, -8], className: 'map-tooltip' },
      );

      if (onNodeClick) {
        marker.on('click', () => onNodeClick(nodeId));
      }

      marker.addTo(layer);
    }
  }, [network, posLookup, onNodeClick]);

  // 4. Draw route overlays
  useEffect(() => {
    if (!layersRef.current || !posLookup) return;
    const routeLayer = layersRef.current.routes;
    const markerLayer = layersRef.current.markers;
    routeLayer.clearLayers();
    markerLayer.clearLayers();

    const first = routes.length > 0 ? routes[0] : undefined;

    // Draw routes (back to front so highlighted is on top)
    if (routes.length > 0) {
      [...routes].reverse().forEach((route, revIdx) => {
        const routeIdx = routes.length - 1 - revIdx;
        const color = ROUTE_COLORS[routeIdx % ROUTE_COLORS.length];
        const isHighlighted = highlightIndex === undefined || highlightIndex === routeIdx;

        const coords: [number, number][] = [];
        for (const nodeId of route.path) {
          const pos = posLookup[nodeId.toString()];
          if (pos) coords.push(pos);
        }

        if (coords.length < 2) return;

        // Glow underlay
        if (isHighlighted) {
          L.polyline(coords, {
            color,
            weight: 8,
            opacity: 0.15,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(routeLayer);
        }

        // Main line
        L.polyline(coords, {
          color,
          weight: isHighlighted ? 4 : 2.5,
          opacity: isHighlighted ? 0.9 : 0.3,
          lineCap: 'round',
          lineJoin: 'round',
          dashArray: isHighlighted ? undefined : '6 4',
        }).addTo(routeLayer);
      });
    } // end routes.length > 0

    // Source / Destination markers
    let srcNodeId: number | undefined;
    let dstNodeId: number | undefined;

    if (first && first.path.length >= 2) {
      srcNodeId = first.path[0];
      dstNodeId = first.path[first.path.length - 1];
    } else if (sourceNode !== undefined && destNode !== undefined) {
      srcNodeId = sourceNode;
      dstNodeId = destNode;
    }

    if (srcNodeId !== undefined) {
      const srcPos = posLookup[srcNodeId.toString()];
      if (srcPos) {
        const srcIcon = L.divIcon({
          className: '',
          html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#10b981;border:3px solid #065f46;box-shadow:0 0 12px rgba(16,185,129,0.5);color:white;font-weight:800;font-size:11px;font-family:Inter,sans-serif">S</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker(srcPos, { icon: srcIcon }).bindTooltip('Start').addTo(markerLayer);
      }
    }

    if (dstNodeId !== undefined) {
      const dstPos = posLookup[dstNodeId.toString()];
      if (dstPos) {
        const dstIcon = L.divIcon({
          className: '',
          html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#ef4444;border:3px solid #991b1b;box-shadow:0 0 12px rgba(239,68,68,0.5);color:white;font-weight:800;font-size:11px;font-family:Inter,sans-serif">D</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker(dstPos, { icon: dstIcon }).bindTooltip('Destination').addTo(markerLayer);
      }
    }

    // Fit bounds to routes
    if (routes.length > 0 && mapRef.current) {
      const allCoords: [number, number][] = [];
      for (const r of routes) {
        for (const nid of r.path) {
          const pos = posLookup[nid.toString()];
          if (pos) allCoords.push(pos);
        }
      }
      if (allCoords.length > 1) {
        mapRef.current.fitBounds(L.latLngBounds(allCoords).pad(0.15), { animate: true, duration: 0.6 });
      }
    }
  }, [routes, highlightIndex, posLookup, sourceNode, destNode]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full rounded-xl overflow-hidden ${className}`}
      style={{ minHeight: 300 }}
    />
  );
});

NetworkMap.displayName = 'NetworkMap';

export default NetworkMap;
