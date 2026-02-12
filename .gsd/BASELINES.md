# Performance Baselines — EV Routing System

> **Date**: 2026-02-11  
> **Phase**: 2 (Component Architecture & Performance)

---

## Bundle Size Analysis

| Metric | Value |
|--------|-------|
| **Total JS (raw)** | 556.39 kB |
| **Total JS (gzipped)** | 155.79 kB |
| **Number of chunks** | 8 (vendor + pages) |

### Bundle Breakdown

**Vendor Chunks (manual split):**
- `vendor-react` — React + React-DOM
- `vendor-map` — Leaflet + React-Leaflet
- `vendor-charts` — Recharts
- `vendor-state` — Zustand + Axios

**Page Chunks (lazy-loaded):**
- Dashboard
- RoutePlanner
- Training
- Analytics

### Largest Dependencies

1. **Leaflet** — Map rendering library
2. **Recharts** — charting library
3. **React** — core UI library
4. **Lucide React** — icon set

### Optimization Status

✅ **Lazy loading enabled** — page chunks load on demand  
✅ **Vendor chunking** — large deps split for caching  
✅ **Code splitting** — React.Suspense boundaries  
✅ **Gzip analysis** — visualizer with gzipSize: true

### Bundle Target (from SPEC.md)

- ✅ **Target**: < 500 KB gzipped  
- ✅ **Actual**: 155.79 kB gzipped  
- **Headroom**: 344.21 kB (69% under target)

---

## Frontend Performance Metrics

| Metric | Target | Status |
|--------|--------|--------|
| TypeScript compilation | 0 errors | ✅ PASS |
| Store tests | 12/12 pass | ✅ PASS |
| Build time | < 30s | ✅ ~15s |
| Bundle size (gzipped) | < 500 KB | ✅ 155.79 kB |

---

## Backend Performance Metrics

| Endpoint | Cache TTL | Status |
|----------|-----------|--------|
| `/api/road-network` | 5 min | ✅ Implemented (Wave 1C) |
| `/api/system-stats` | 10 s | ✅ Implemented (Wave 1C) |
| Response headers | `X-Response-Time` | ✅ Present |

---

## Phase 2 Achievements

- Reduced initial bundle load via lazy-loaded routes
- Optimized React re-renders with selector hooks + React.memo
- Achieved 69% headroom on bundle size target
- Vendor chunks enable efficient browser caching
- Manual chunk configuration future-proofs scaling
