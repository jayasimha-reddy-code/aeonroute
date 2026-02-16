---
phase: 04-map-route-visualization
plan: 01
subsystem: ui
tags: [maplibre-gl, react-map-gl, geojson, webgl, map]

requires:
  - phase: 03-design-system
    provides: Glass components, theme system (useThemeStore), Tailwind dark mode
provides:
  - MapLibre GL JS WebGL map foundation
  - GeoJSON coordinate conversion utilities (toLngLat, networkToGeoJSON, routeToGeoJSON)
  - Dark/light CartoDB raster tile styles with seamless styleDiffing
  - Interactive node layers (click-to-select, hover popup)
  - Source/Destination marker components
  - Backward-compatible NetworkMap re-export wrapper
affects: [04-02, visualization, map]

tech-stack:
  added: [maplibre-gl@5.18.0, react-map-gl@8.1.0]
  removed: [leaflet@1.9.4, react-leaflet@4.2.1, @types/leaflet]
  patterns: [declarative Source/Layer from react-map-gl, GeoJSON circle layers for GPU-rendered nodes, MapLibre StyleSpecification for tile config]

key-files:
  created:
    - frontend/src/lib/geo.ts
    - frontend/src/components/map/mapStyles.ts
    - frontend/src/hooks/useMapTheme.ts
    - frontend/src/components/map/MapView.tsx
    - frontend/src/components/map/NetworkEdgesLayer.tsx
    - frontend/src/components/map/NetworkNodesLayer.tsx
    - frontend/src/components/map/NodeMarkers.tsx
  modified:
    - frontend/src/components/NetworkMap.tsx
    - frontend/src/index.css
    - frontend/vite.config.ts
    - frontend/vite.config.js
    - frontend/package.json

key-decisions:
  - "CartoDB raster tiles (dark_all/light_all) — no API key needed, same provider as Leaflet version"
  - "Same source ID 'carto-tiles' in both dark/light styles enables seamless styleDiffing toggle"
  - "Circle layers for nodes (GPU-rendered) instead of DOM Markers for performance"
  - "NetworkMap.tsx converted to thin re-export wrapper for backward compatibility"
  - "GeoJSON [lng, lat] coordinate order throughout — Leaflet's [lat, lng] convention eliminated"

patterns-established:
  - "Declarative map layers: Source + Layer components from react-map-gl for all map features"
  - "GeoJSON-first: all map data converted to GeoJSON FeatureCollections before rendering"
  - "useMapTheme hook: centralized theme-aware map style selection"
  - "Map component tree: MapView > NetworkEdgesLayer + NetworkNodesLayer + NodeMarkers + children"

duration: 25min
completed: 2025-07-20
---

# Plan 04-01: MapLibre GL JS Foundation Summary

**Replaced Leaflet with MapLibre GL JS for GPU-accelerated WebGL map rendering, creating a full component tree with interactive nodes and theme-reactive dark/light tile switching.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2 (combined into single commit due to tight coupling)
- **Files created:** 7
- **Files modified:** 5

## Accomplishments

- Installed maplibre-gl@5.18.0 + react-map-gl@8.1.0, fully removed leaflet/react-leaflet/@types/leaflet
- Created geo.ts with toLngLat, buildPosLookup, networkToGeoJSON, routeToGeoJSON — all using GeoJSON [lng, lat] order
- Built MapView.tsx with declarative Source/Layer architecture: NetworkEdgesLayer (line layer), NetworkNodesLayer (circle layer with charging station pulse), NodeMarkers (Marker components for S/D)
- Interactive node features: click fires onNodeClick, hover shows glass-styled Popup with node ID + charging status
- Dark/light CartoDB raster tiles switch reactively via useMapTheme hook
- Vite manual chunks updated from leaflet to maplibre-gl + react-map-gl/maplibre

## Task Commits

1. **Tasks 1+2: Install deps + create MapView component tree** - `9e0d399` (feat)

## Files Created/Modified

- `frontend/src/lib/geo.ts` — Coordinate conversion and GeoJSON utilities
- `frontend/src/components/map/mapStyles.ts` — Dark/light CartoDB StyleSpecification + ROUTE_COLORS
- `frontend/src/hooks/useMapTheme.ts` — Theme-aware map style hook
- `frontend/src/components/map/MapView.tsx` — Main MapLibre GL wrapper (~230 lines)
- `frontend/src/components/map/NetworkEdgesLayer.tsx` — GeoJSON line layer for edges
- `frontend/src/components/map/NetworkNodesLayer.tsx` — GeoJSON circle layer for nodes with pulse
- `frontend/src/components/map/NodeMarkers.tsx` — Source/Destination marker components
- `frontend/src/components/NetworkMap.tsx` — Thin re-export wrapper for backward compat
- `frontend/src/index.css` — Leaflet CSS removed, MapLibre glass popup overrides added
- `frontend/vite.config.ts` + `frontend/vite.config.js` — Manual chunks updated

## Deviations from Plan

### Auto-fixed Issues

**1. Template literal corruption in NodeMarkers.tsx**
- **Found during:** Task 2 (component creation)
- **Issue:** PowerShell here-string mangles JS template literals — border and boxShadow lost backtick syntax
- **Fix:** Rewrote file using [System.IO.File]::WriteAllText with single-quoted here-string
- **Verification:** npx tsc --noEmit passes

**2. GeoJSON type predicate mismatch in geo.ts**
- **Found during:** TypeScript verification
- **Issue:** Filter type predicate `f is GeoJSON.Feature<GeoJSON.LineString>` incompatible with inline object type (properties: {} vs GeoJsonProperties which allows null)
- **Fix:** Changed to NonNullable<typeof f> pattern and typed properties as Record<string, unknown>
- **Verification:** npx tsc --noEmit passes

**3. Vite manual chunks referencing removed packages**
- **Found during:** vite build
- **Issue:** vite.config.ts and vite.config.js still had `['leaflet', 'react-leaflet']` in manualChunks
- **Fix:** Updated to `['maplibre-gl', 'react-map-gl/maplibre']` (subpath required — react-map-gl has no root export)
- **Verification:** npx vite build succeeds

**Total deviations:** 3 auto-fixed
**Impact on plan:** All fixes necessary for correctness. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None — CartoDB tiles are free, no API key needed.

## Next Phase Readiness

- MapView accepts `children` prop — Plan 02 RouteLayer can be added as a child
- MapView has inline route rendering (glow + main layers) that Plan 02's RouteLayer will replace
- ROUTE_COLORS exported from mapStyles.ts for use by RouteLayer and RouteLegend
- routeToGeoJSON and buildPosLookup ready for RouteLayer consumption
- Build passes, TypeScript clean, no leaflet references remain

---

_Phase: 04-map-route-visualization_
_Completed: 2025-07-20_