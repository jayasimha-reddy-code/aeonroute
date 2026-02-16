# Phase 04: Map & Route Visualization — Research

**Researched:** 2026-02-16
**Domain:** WebGL Map Rendering (MapLibre GL JS), React Integration, Animated Geospatial Visualization
**Confidence:** HIGH (core stack), MEDIUM (animation patterns), MEDIUM (free tile sources)

## Summary

Phase 04 replaces the current Leaflet-based `NetworkMap.tsx` with MapLibre GL JS for GPU-accelerated WebGL map rendering. The existing component (~280 lines) uses direct `L.map()` calls with CartoDB dark raster tiles, abstract-to-lat/lng coordinate conversion, `L.polyline` routes, and `L.circleMarker` nodes. The migration adds animated route drawing, energy consumption color gradients, dark/light theme switching, click-to-select source/destination, route comparison with legends, and interactive node hover/click.

The standard approach is **react-map-gl v8.1** (from vis.gl/OpenJS Foundation) with the `react-map-gl/maplibre` entry point as the React wrapper, paired with **maplibre-gl v5.x** as the rendering engine. This is the officially recommended React binding listed by MapLibre themselves. The wrapper provides declarative `<Map>`, `<Source>`, `<Layer>`, `<Marker>`, and `<Popup>` components that map cleanly to MapLibre GL JS concepts while handling React lifecycle correctly.

**Primary recommendation:** Use `react-map-gl/maplibre` v8.1 + `maplibre-gl` v5.x with OpenFreeMap or CartoDB raster tiles (no API key). Use `line-gradient` paint property for energy gradients, `requestAnimationFrame`-based GeoJSON slicing for animated route reveal, and `mapStyle` prop switching for dark/light themes.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---|---|---|---|
| `maplibre-gl` | ^5.18.0 | WebGL map rendering engine | GPU-accelerated, open-source fork of Mapbox GL, 1.3M weekly npm downloads |
| `react-map-gl` | ^8.1.0 | React declarative wrapper | Official vis.gl/OpenJS binding recommended by MapLibre. 1.2M weekly npm downloads. Provides `<Map>`, `<Source>`, `<Layer>`, `<Marker>`, `<Popup>` |

### Supporting

| Library | Version | Purpose | When to Use |
|---|---|---|---|
| `@turf/along` | ^7.x | Point-along-line calculation | For animated progressive route reveal (compute intermediate points) |
| `@turf/line-slice` | ^7.x | Slice a LineString at a point | For progressive reveal — slice route up to current progress |
| `@turf/length` | ^7.x | Measure total LineString length | For animation progress normalization |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| `react-map-gl` | `maplibre-gl` direct (useRef + useEffect) | More control but much more boilerplate, manual lifecycle management, re-render issues |
| `react-map-gl` | `maplibre-react-components` | Lighter weight but much smaller community, fewer examples, less battle-tested |
| OpenFreeMap tiles | MapTiler free tier | MapTiler has better vector styles but requires API key signup |
| CartoDB raster tiles | OpenFreeMap vector tiles | CartoDB simpler but raster-only; OpenFreeMap gives true vector tiles for free |

### What to Remove

| Package | Reason |
|---|---|
| `leaflet` | Replaced by maplibre-gl |
| `react-leaflet` | Replaced by react-map-gl |
| `@types/leaflet` | No longer needed |

### Installation

```bash
cd frontend
npm install maplibre-gl react-map-gl
npm install @turf/along @turf/line-slice @turf/length
npm uninstall leaflet react-leaflet @types/leaflet
```

---

## Architecture Patterns

### Recommended Project Structure

```
frontend/src/
├── components/
│   ├── map/
│   │   ├── MapView.tsx           # Main <Map> wrapper (replaces NetworkMap.tsx)
│   │   ├── NetworkEdgesLayer.tsx  # GeoJSON Source + Line Layer for road edges
│   │   ├── NetworkNodesLayer.tsx  # GeoJSON Source + Circle Layer for nodes
│   │   ├── RouteLayer.tsx         # Route polylines with gradient + animation
│   │   ├── RouteAnimator.tsx      # Animation controller (progressive reveal)
│   │   ├── NodeMarkers.tsx        # Source/Destination markers
│   │   ├── RouteLegend.tsx        # Legend overlay for route comparison
│   │   └── mapStyles.ts           # Dark/light style JSON definitions
│   └── ...existing components...
├── hooks/
│   ├── useMapTheme.ts            # Dark/light map style based on app theme
│   └── useAnimatedRoute.ts       # Progressive reveal animation hook
└── lib/
    └── geo.ts                    # Coordinate conversion utilities (toLatLng, toGeoJSON)
```

### Pattern 1: Declarative Map with react-map-gl/maplibre

**What:** Use the `<Map>` component from `react-map-gl/maplibre` as an uncontrolled component with `initialViewState`.
**When to use:** Always — this is the standard React integration pattern.

```typescript
// Source: react-map-gl official docs (https://visgl.github.io/react-map-gl/docs/api-reference/maplibre/map)
import Map, { Source, Layer, Marker, Popup, useMap } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MapRef, LineLayer, CircleLayer } from 'react-map-gl/maplibre';

function MapView({ isDarkMode, network, routes, ... }) {
  const mapRef = useRef<MapRef>(null);

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: -97.7431,
        latitude: 30.2672,
        zoom: 13,
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={isDarkMode ? DARK_STYLE : LIGHT_STYLE}
    >
      {/* Declarative layers as children */}
      <Source id="edges" type="geojson" data={edgesGeoJSON}>
        <Layer {...edgesLayerStyle} />
      </Source>
      <Source id="nodes" type="geojson" data={nodesGeoJSON}>
        <Layer {...nodesLayerStyle} />
      </Source>
      {/* Route layers, markers, etc. */}
    </Map>
  );
}
```

### Pattern 2: GeoJSON Source with Line Gradient for Energy Colors

**What:** Use MapLibre's native `line-gradient` paint property on a GeoJSON source with `lineMetrics: true`.
**When to use:** For the energy consumption color gradient along routes (MAP-04).

```typescript
// Source: MapLibre Style Spec (https://maplibre.org/maplibre-style-spec/layers/#paint-line-line-gradient)
// CRITICAL: The GeoJSON source MUST have lineMetrics: true for line-gradient to work

// Convert route to GeoJSON with energy values encoded as line-progress
function routeToGradientGeoJSON(route: Route, posLookup: Record<string, [number, number]>): GeoJSON.Feature {
  const coordinates = route.path.map(nodeId => {
    const [lat, lng] = posLookup[nodeId.toString()];
    return [lng, lat]; // GeoJSON uses [lng, lat]
  });

  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates },
  };
}

// The line-gradient expression uses line-progress (0 to 1 along the line)
// Map energy_kwh to a green→yellow→red gradient
const energyGradientLayer: LineLayer = {
  id: 'route-energy',
  type: 'line',
  paint: {
    'line-width': 5,
    'line-gradient': [
      'interpolate',
      ['linear'],
      ['line-progress'],
      0, '#10b981',     // green — low energy
      0.4, '#f59e0b',   // yellow — moderate
      0.8, '#ef4444',   // red — high energy
      1, '#dc2626',     // deep red — very high
    ],
  },
  layout: {
    'line-cap': 'round',
    'line-join': 'round',
  },
};

// In JSX:
<Source id="route-energy" type="geojson" data={gradientGeoJSON} lineMetrics>
  <Layer {...energyGradientLayer} />
</Source>
```

**Key constraint:** `line-gradient` requires `lineMetrics: true` on the GeoJSON source. It is disabled by `line-dasharray` and `line-pattern`. One gradient per GeoJSON Feature — if comparing multiple routes, use separate Sources.

### Pattern 3: Animated Route Reveal via GeoJSON Slicing

**What:** Progressive polyline animation by updating GeoJSON data on each animation frame.
**When to use:** For MAP-03 (animated route drawing / progressive reveal).

```typescript
// Approach: Use requestAnimationFrame to incrementally reveal the route
// by updating the GeoJSON data to show only the portion up to the current progress.

import along from '@turf/along';
import lineSlice from '@turf/line-slice';
import length from '@turf/length';

function useAnimatedRoute(fullRoute: GeoJSON.Feature<GeoJSON.LineString> | null, durationMs = 2000) {
  const [visibleRoute, setVisibleRoute] = useState<GeoJSON.Feature<GeoJSON.LineString> | null>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!fullRoute) { setVisibleRoute(null); return; }

    const totalLength = length(fullRoute, { units: 'kilometers' });
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Get the point at current progress
      const currentPoint = along(fullRoute, totalLength * progress, { units: 'kilometers' });
      const start = fullRoute.geometry.coordinates[0];

      // Slice the line from start to current point
      const sliced = lineSlice(
        { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: start } },
        currentPoint,
        fullRoute,
      );

      setVisibleRoute(sliced);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [fullRoute, durationMs]);

  return visibleRoute;
}
```

**Alternative simpler approach:** Instead of turf slicing, progressively add coordinates from the full path array on each frame. This avoids the turf dependency but is less smooth for curved paths:

```typescript
// Simpler: progressively reveal coordinates
function useAnimatedCoords(coords: [number, number][], durationMs = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!coords.length) return;
    const total = coords.length;
    const startTime = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / durationMs, 1);
      const newCount = Math.max(2, Math.ceil(progress * total)); // min 2 points for a line
      setCount(newCount);
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [coords, durationMs]);

  return coords.slice(0, count);
}
```

### Pattern 4: Dark/Light Map Style Switching

**What:** Switch `mapStyle` prop on the `<Map>` component when app theme changes.
**When to use:** For MAP-02 (dark mode map style that switches with app theme).

```typescript
// react-map-gl handles style diffing automatically when mapStyle prop changes.
// Use styleDiffing={true} (default) for smooth transitions.

// Option A: Raster tile styles (simplest, no API key)
const DARK_STYLE = {
  version: 8 as const,
  sources: {
    'carto-dark': {
      type: 'raster' as const,
      tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '© OSM © CARTO',
    },
  },
  layers: [{ id: 'carto-dark-layer', type: 'raster' as const, source: 'carto-dark' }],
};

const LIGHT_STYLE = {
  version: 8 as const,
  sources: {
    'carto-light': {
      type: 'raster' as const,
      tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '© OSM © CARTO',
    },
  },
  layers: [{ id: 'carto-light-layer', type: 'raster' as const, source: 'carto-light' }],
};

// Option B: Vector tile styles (richer, but needs API key or free provider)
// OpenFreeMap — free, no API key, OpenMapTiles schema
const DARK_VECTOR_STYLE = 'https://tiles.openfreemap.org/styles/dark';
const LIGHT_VECTOR_STYLE = 'https://tiles.openfreemap.org/styles/positron';

// In component:
const { isDarkMode } = useTheme();
<Map mapStyle={isDarkMode ? DARK_STYLE : LIGHT_STYLE} />
```

**Important:** When `mapStyle` changes, react-map-gl applies a diff by default (`styleDiffing={true}`). This preserves dynamically added Sources and Layers. If styles are incompatible (different source names), use `styleDiffing={false}` to force a full rebuild.

### Pattern 5: Click-to-Select Source/Destination on Nodes

**What:** Use `interactiveLayerIds` + `onClick` on `<Map>` to select nodes.
**When to use:** For MAP-05 (click-to-select source and destination on map).

```typescript
// Use interactiveLayerIds to make the node layer clickable.
// The onClick handler receives features from those layers.

<Map
  interactiveLayerIds={['nodes-layer']}
  onClick={(evt) => {
    const feature = evt.features?.[0];
    if (feature && feature.properties?.nodeId !== undefined) {
      const nodeId = feature.properties.nodeId;
      if (!hasSource) {
        setSource(nodeId);
      } else {
        setDestination(nodeId);
      }
    }
  }}
  onMouseEnter={() => setCursor('pointer')}
  onMouseLeave={() => setCursor('auto')}
  cursor={cursor}
>
  <Source id="nodes" type="geojson" data={nodesGeoJSON}>
    <Layer
      id="nodes-layer"
      type="circle"
      paint={{
        'circle-radius': ['case', ['get', 'isCharging'], 7, 4],
        'circle-color': ['case', ['get', 'isCharging'], '#f59e0b', '#10b981'],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': ['case', ['get', 'isCharging'], '#92400e', '#065f46'],
      }}
    />
  </Source>
</Map>
```

### Pattern 6: Interactive Node Hover with Popup

**What:** Show a popup on hover over nodes using the `<Popup>` component.
**When to use:** For MAP-07 (hover shows details, click selects).

```typescript
const [hoverInfo, setHoverInfo] = useState<{ lng: number; lat: number; nodeId: number; isCharging: boolean } | null>(null);

<Map
  interactiveLayerIds={['nodes-layer']}
  onMouseMove={(evt) => {
    const feature = evt.features?.[0];
    if (feature) {
      setHoverInfo({
        lng: evt.lngLat.lng,
        lat: evt.lngLat.lat,
        nodeId: feature.properties?.nodeId,
        isCharging: feature.properties?.isCharging,
      });
    } else {
      setHoverInfo(null);
    }
  }}
  onMouseLeave={() => setHoverInfo(null)}
>
  {hoverInfo && (
    <Popup
      longitude={hoverInfo.lng}
      latitude={hoverInfo.lat}
      closeButton={false}
      anchor="bottom"
      offset={10}
    >
      <div className="text-xs font-medium">
        {hoverInfo.isCharging ? `⚡ Charging Station #${hoverInfo.nodeId}` : `Node ${hoverInfo.nodeId}`}
      </div>
    </Popup>
  )}
</Map>
```

### Pattern 7: Route Comparison with Multiple Layers

**What:** Render 2-3 alternative routes simultaneously with distinguishable colors and legend.
**When to use:** For MAP-06 (route comparison).

```typescript
// Each route gets its own Source + Layer pair for independent styling.
// Use line-offset for parallel routes that share segments.

const ROUTE_COLORS = ['#10b981', '#6366f1', '#f59e0b'];

{routes.slice(0, 3).map((route, idx) => {
  const geojson = routeToGeoJSON(route, posLookup);
  const isHighlighted = highlightIdx === idx;

  return (
    <Source key={`route-${idx}`} id={`route-${idx}`} type="geojson" data={geojson} lineMetrics>
      {/* Glow underlay */}
      <Layer
        id={`route-glow-${idx}`}
        type="line"
        paint={{
          'line-color': ROUTE_COLORS[idx],
          'line-width': isHighlighted ? 10 : 0,
          'line-opacity': 0.15,
          'line-blur': 4,
        }}
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
      />
      {/* Main line */}
      <Layer
        id={`route-main-${idx}`}
        type="line"
        paint={{
          'line-color': ROUTE_COLORS[idx],
          'line-width': isHighlighted ? 4 : 2.5,
          'line-opacity': isHighlighted ? 0.9 : 0.35,
        }}
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
      />
    </Source>
  );
})}
```

### Anti-Patterns to Avoid

- **Using `mapRef.current.getMap()` for everything:** Access the native map only when react-map-gl doesn't expose the functionality (e.g., custom canvas operations). Prefer declarative `<Source>` / `<Layer>` components.
- **Creating new GeoJSON objects on every render:** Memoize GeoJSON data with `useMemo` — react-map-gl does shallow comparison on Source `data` prop.
- **Mixing imperative Leaflet patterns:** Don't try to add/remove layers via `map.addLayer()` — use conditional JSX rendering instead.
- **Forgetting `maplibre-gl/dist/maplibre-gl.css`:** The map won't render controls/popups correctly without the CSS import.
- **Inline layer style objects:** Define layer styles as constants outside the component or memoize them. Inline objects create new references every render, triggering unnecessary style diffs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Line gradient along route | Manual canvas overlay / SVG gradient | MapLibre `line-gradient` paint property | GPU-accelerated, handles zoom/pan correctly, built into GL renderer |
| Coordinate conversion | Custom math | Keep existing `toLatLng()` function | Already works, but extract to `lib/geo.ts` and add GeoJSON helpers |
| Map-React lifecycle | Manual `useEffect` + `useRef` for map init/cleanup | `react-map-gl` `<Map>` component | Handles canvas resize, style diffing, event delegation, ref forwarding |
| Progressive route animation | CSS animation on polylines | `requestAnimationFrame` + GeoJSON data update | CSS can't animate along a geographic path; must slice the geometry |
| Popup positioning | Manual DOM calculations | `react-map-gl` `<Popup>` component | Handles geo-projection, viewport clamping, anchor offsets |
| Map dark/light switching | Removing and re-adding tile layers | `mapStyle` prop change with `styleDiffing` | react-map-gl applies minimal diffs to preserve dynamic layers |

**Key insight:** MapLibre GL's style specification handles almost all visual concerns declaratively. The expression language (`['interpolate', ...]`, `['case', ...]`, `['get', ...]`) is powerful enough for data-driven styling without custom code. Invest time learning expressions instead of building workarounds.

---

## Common Pitfalls

### Pitfall 1: GeoJSON Coordinate Order

**What goes wrong:** Coordinates are [lat, lng] (Leaflet convention) instead of [lng, lat] (GeoJSON/MapLibre convention).
**Why it happens:** The current codebase uses Leaflet's `[lat, lng]` convention everywhere. MapLibre and GeoJSON use `[lng, lat]`.
**How to avoid:** Create a single `toGeoJSONCoord(x, y, center)` utility that returns `[lng, lat]` and use it consistently. The existing `toLatLng()` returns `[lat, lng]` — add a sibling `toLngLat()`.
**Warning signs:** Map renders blank or points appear in the ocean.

### Pitfall 2: line-gradient Requires lineMetrics

**What goes wrong:** `line-gradient` paint property is silently ignored.
**Why it happens:** Forgot to set `lineMetrics: true` on the GeoJSON Source.
**How to avoid:** Always add `lineMetrics` prop to `<Source>` when using `line-gradient`.
**Warning signs:** Route appears but is solid color instead of gradient.

### Pitfall 3: Source/Layer IDs Must Be Stable and Unique

**What goes wrong:** Layers disappear/duplicate when routes change.
**Why it happens:** Dynamic layer IDs or missing React `key` props cause react-map-gl to lose track of layers.
**How to avoid:** Use stable, deterministic IDs (`route-0`, `route-1`, `route-2`). Use React `key` on `<Source>` when dynamically rendering.
**Warning signs:** Warning about duplicate source/layer IDs in console.

### Pitfall 4: Style Change Destroys Dynamic Layers

**What goes wrong:** Switching dark/light mode removes all dynamically added route layers.
**Why it happens:** When `styleDiffing={false}` or when dark/light styles have incompatible source names, the entire style is replaced.
**How to avoid:** Keep `styleDiffing={true}` (default). Ensure dark and light styles use the same base source ID structure. Or use raster tile styles where the base map is a single raster source — dynamic GeoJSON layers are preserved.
**Warning signs:** Routes disappear when toggling theme.

### Pitfall 5: Performance with Large Node Sets

**What goes wrong:** Map becomes sluggish with 100+ nodes rendered as individual React components.
**Why it happens:** Using `<Marker>` React components for each node creates DOM elements. Our network has ~100 nodes.
**How to avoid:** Use a `circle` type Layer with GeoJSON source for nodes — this renders them on the GPU via WebGL. Reserve `<Marker>` components only for the source/destination markers (2 total).
**Warning signs:** React devtools shows 100+ Marker component instances, frame drops on pan/zoom.

### Pitfall 6: Missing CSS Import

**What goes wrong:** Map renders but controls are unstyled, popups are broken, attribution overlaps.
**Why it happens:** Forgot to import `maplibre-gl/dist/maplibre-gl.css`.
**How to avoid:** Import it at the top of the MapView component file.
**Warning signs:** Map renders but looks broken around controls/popups.

### Pitfall 7: Stale Closure in Animation Hook

**What goes wrong:** Animated route keeps drawing old route data after a new route is selected.
**Why it happens:** `requestAnimationFrame` callback captures stale state.
**How to avoid:** Use refs for mutable animation state. Cancel previous animation with `cancelAnimationFrame` when route data changes (use `useEffect` cleanup).
**Warning signs:** Two animations running simultaneously, wrong route animating.

---

## Code Examples

### Basic MapView Setup (Replacing NetworkMap.tsx)

```typescript
// Source: react-map-gl docs + MapLibre docs
import { useRef, useMemo, useCallback, useState } from 'react';
import Map, { Source, Layer, Marker, Popup, NavigationControl } from 'react-map-gl/maplibre';
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from '../store/store';
import { DARK_STYLE, LIGHT_STYLE } from './map/mapStyles';

export default function MapView({ network, routes, onNodeClick, ... }) {
  const mapRef = useRef<MapRef>(null);
  const { isDarkMode } = useTheme();
  const [cursor, setCursor] = useState('auto');

  // Convert network to GeoJSON (memoized)
  const { nodesGeoJSON, edgesGeoJSON } = useMemo(() => {
    if (!network) return { nodesGeoJSON: null, edgesGeoJSON: null };
    return networkToGeoJSON(network, center);
  }, [network]);

  const handleClick = useCallback((evt: MapLayerMouseEvent) => {
    const feature = evt.features?.[0];
    if (feature?.properties?.nodeId != null) {
      onNodeClick?.(feature.properties.nodeId);
    }
  }, [onNodeClick]);

  return (
    <Map
      ref={mapRef}
      initialViewState={{ longitude: -97.7431, latitude: 30.2672, zoom: 13 }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={isDarkMode ? DARK_STYLE : LIGHT_STYLE}
      interactiveLayerIds={['nodes-layer']}
      onClick={handleClick}
      onMouseEnter={() => setCursor('pointer')}
      onMouseLeave={() => setCursor('auto')}
      cursor={cursor}
    >
      <NavigationControl position="top-right" />

      {edgesGeoJSON && (
        <Source id="network-edges" type="geojson" data={edgesGeoJSON}>
          <Layer id="edges-layer" type="line" paint={{
            'line-color': isDarkMode ? '#475569' : '#cbd5e1',
            'line-width': 1.2,
            'line-opacity': 0.2,
          }} />
        </Source>
      )}

      {nodesGeoJSON && (
        <Source id="network-nodes" type="geojson" data={nodesGeoJSON}>
          <Layer id="nodes-layer" type="circle" paint={{
            'circle-radius': ['case', ['get', 'isCharging'], 7, 3.5],
            'circle-color': ['case', ['get', 'isCharging'], '#f59e0b', '#10b981'],
            'circle-opacity': ['case', ['get', 'isCharging'], 0.95, 0.7],
            'circle-stroke-width': ['case', ['get', 'isCharging'], 2, 1],
            'circle-stroke-color': ['case', ['get', 'isCharging'], '#92400e', '#065f46'],
          }} />
        </Source>
      )}

      {/* Route layers rendered here */}
      {/* Source/Destination Markers rendered here */}
    </Map>
  );
}
```

### Network-to-GeoJSON Conversion

```typescript
// lib/geo.ts
import type { RoadNetworkData } from '../services/api';

export function toLngLat(
  x: number, y: number,
  center: [number, number] = [30.2672, -97.7431],
  spread = 0.045
): [number, number] {
  const lat = center[0] + (y / 100 - 0.5) * spread * 2;
  const lng = center[1] + (x / 100 - 0.5) * spread * 2;
  return [lng, lat]; // GeoJSON order
}

export function networkToGeoJSON(network: RoadNetworkData, center: [number, number]) {
  // Nodes as GeoJSON FeatureCollection of Points
  const nodeFeatures = Object.entries(network.nodes_pos).map(([id, pos]) => ({
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

  // Edges as GeoJSON FeatureCollection of LineStrings
  const edgeFeatures = network.edges_list.map((edge) => {
    const from = network.nodes_pos[edge.source.toString()];
    const to = network.nodes_pos[edge.target.toString()];
    if (!from || !to) return null;
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          toLngLat(from.x, from.y, center),
          toLngLat(to.x, to.y, center),
        ],
      },
    };
  }).filter(Boolean);

  return {
    nodesGeoJSON: { type: 'FeatureCollection' as const, features: nodeFeatures },
    edgesGeoJSON: { type: 'FeatureCollection' as const, features: edgeFeatures },
  };
}
```

### MapLibre Raster Style Definitions (No API Key)

```typescript
// components/map/mapStyles.ts
import type { StyleSpecification } from 'maplibre-gl';

// CartoDB raster tiles — free, unlimited, no key needed
export const DARK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'carto-tiles': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    },
  },
  layers: [{ id: 'carto-tiles', type: 'raster', source: 'carto-tiles' }],
};

export const LIGHT_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'carto-tiles': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    },
  },
  layers: [{ id: 'carto-tiles', type: 'raster', source: 'carto-tiles' }],
};
```

**Key design choice:** Using the same source ID (`'carto-tiles'`) in both dark and light styles means `styleDiffing` will correctly update only the tile URLs when switching themes, preserving all dynamically added GeoJSON layers (routes, nodes, edges).

### FitBounds to Routes

```typescript
// Use mapRef to fit bounds after routes are generated
import { LngLatBounds } from 'maplibre-gl';

function fitToRoutes(mapRef: React.RefObject<MapRef>, routes: Route[], posLookup: Record<string, [number, number]>) {
  if (!mapRef.current || !routes.length) return;

  const bounds = new LngLatBounds();
  for (const route of routes) {
    for (const nodeId of route.path) {
      const coord = posLookup[nodeId.toString()];
      if (coord) bounds.extend(coord); // [lng, lat]
    }
  }

  if (!bounds.isEmpty()) {
    mapRef.current.fitBounds(bounds, { padding: 60, duration: 600 });
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Leaflet with raster tiles | MapLibre GL JS (WebGL vector/raster) | MapLibre forked 2020, now v5.x | GPU-accelerated rendering, smooth zoom, rotation, 3D support |
| react-leaflet | react-map-gl/maplibre | react-map-gl v7+ added MapLibre entry point | Declarative Source/Layer components, proper React lifecycle |
| Manual DOM markers | GeoJSON Circle layers | Native to GL spec | Thousands of points rendered on GPU, no DOM overhead |
| CSS/SVG gradients for line color | `line-gradient` paint property | MapLibre v0.45+ | GPU-rendered gradient along geographic line, zoom-independent |
| Mapbox GL JS (proprietary v2+) | MapLibre GL JS (open source) | Dec 2020 fork | No API key needed, community-driven, BSD-3 license |

**Deprecated/outdated:**
- Leaflet + react-leaflet for this use case: DOM-based rendering can't match WebGL performance for interactive animated routes
- Mapbox GL JS v2+: Requires API key and commercial license even for self-hosted tiles

---

## Free Tile Sources (No API Key)

| Provider | Type | Dark Style | Light Style | Notes |
|---|---|---|---|---|
| **CartoDB/CARTO** | Raster | `dark_all` | `light_all` | Currently used, reliable, @2x retina support |
| **OpenFreeMap** | Vector | `dark` style | `positron` style | Free, no API key, OpenMapTiles schema, best vector option |
| **Stamen/Stadia** | Raster | Toner | Terrain | Some require API key now |
| **MapLibre Demo Tiles** | Vector | N/A | Basic only | For demos only, limited detail |

**Recommendation for Phase 04:** Start with CartoDB raster tiles (migration is simpler — same tiles, just different renderer). Optionally upgrade to OpenFreeMap vector tiles in a later enhancement. CartoDB raster tiles are simpler because:
1. Already used — visual appearance stays the same
2. No additional tile schema to learn
3. Dark/light switching is just URL change
4. No vector tile configuration needed

---

## Open Questions

1. **Energy gradient data availability**
   - What we know: Backend returns `energy_kwh` as a single value per route, not per-segment
   - What's unclear: Do we need per-segment energy data for a realistic gradient, or simulate it from distance ratios?
   - Recommendation: For v1, simulate gradient based on distance progression (even distribution). The visual effect is the same. Per-segment data can be added later if the backend exposes it.

2. **Route comparison — overlapping segments**
   - What we know: Multiple routes may share segments (e.g., same starting roads)
   - What's unclear: Should overlapping segments be offset (parallel lines) or stacked?
   - Recommendation: Use `line-offset` paint property (e.g., -3px, 0px, +3px) to separate overlapping routes. This is a MapLibre built-in feature. Fall back to opacity differentiation if offset looks too dense on the small map area.

3. **Turf.js bundle impact**
   - What we know: Turf subpackages (`@turf/along`, `@turf/line-slice`, `@turf/length`) are tree-shakeable
   - What's unclear: Exact bundle size impact
   - Recommendation: Use the simpler coordinate-slicing approach first (no turf needed). Only add turf if smooth curved animation is needed.

---

## Sources

### Primary (HIGH confidence)

- **npm: maplibre-gl** — v5.18.0, 1.3M weekly downloads, BSD-3 license (verified 2026-02-16)
- **npm: react-map-gl** — v8.1.0, 1.2M weekly downloads, MIT license (verified 2026-02-16)
- **react-map-gl/maplibre Map API reference** — https://visgl.github.io/react-map-gl/docs/api-reference/maplibre/map (verified)
- **react-map-gl/maplibre Source API** — https://visgl.github.io/react-map-gl/docs/api-reference/maplibre/source (verified)
- **react-map-gl/maplibre Layer API** — https://visgl.github.io/react-map-gl/docs/api-reference/maplibre/layer (verified)
- **MapLibre Style Spec: Layers** — https://maplibre.org/maplibre-style-spec/layers/ (verified `line-gradient` docs)
- **MapLibre official React recommendation** — Links to react-map-gl from maplibre-gl-js README

### Secondary (MEDIUM confidence)

- **awesome-maplibre** — GitHub curated list of MapLibre ecosystem (verified 2026-02-16)
- **OpenFreeMap** — https://openfreemap.org/ — Free vector tile provider (listed in awesome-maplibre + OSM wiki)
- **CartoDB basemaps** — https://basemaps.cartocdn.com/ — Currently in use, free raster tiles

### Tertiary (LOW confidence)

- Animation patterns (coordinate slicing, requestAnimationFrame approach) — Based on training data knowledge of MapLibre examples and common WebGL animation patterns. No official "animated route" example found in MapLibre docs. Approach is well-established in the Mapbox/MapLibre ecosystem.

---

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — react-map-gl + maplibre-gl is the de facto React + MapLibre pairing, verified via npm, official docs, and MapLibre recommendations
- Architecture: **HIGH** — Declarative Source/Layer pattern is official react-map-gl API, well-documented
- Animation patterns: **MEDIUM** — requestAnimationFrame + GeoJSON update is the common approach but no single canonical source; validated against MapLibre's rendering model
- Pitfalls: **HIGH** — Based on verified API constraints (lineMetrics requirement, coordinate order, CSS import) from official docs
- Free tiles: **MEDIUM** — CartoDB verified (in use now); OpenFreeMap verified from multiple community sources but not yet tested in this project

**Research date:** 2026-02-16
**Valid until:** 2026-04-16 (60 days — stable libraries, slow-moving ecosystem)