---
phase: 12-hyper-fidelity-ui-replication
plan: 01
subsystem: ui
tags: [react-router-dom, routing, sidebar-collapse, navlink, pages, navigation]

requires:
  - phase: 11-ultra-premium-bento-ui
    provides: Design tokens, glass utilities, permanent dark mode, Card/StatCard/ProgressRing

provides:
  - react-router-dom URL-based SPA routing (replaces Zustand tab switcher)
  - Stations page with bento grid, search, 8 mock stations, detail panel
  - Settings page with vehicle profile, route prefs, display, API panels
  - Sidebar collapse/expand toggle with localStorage persistence
  - NavLink-based active nav with inset emerald indicator
  - Header title derived from URL pathname
  - App shell studio lighting radial gradient

affects:
  - phase: 12-02
    needs: All pages routable, sidebar state functional
  - phase: 12-03
    needs: Pages in place for chart upgrades
  - phase: 12-05
    needs: Route transitions for Framer Motion page animations

tech-stack:
  added: [react-router-dom]
  patterns: [url-driven-navigation, sidebar-collapse, lazy-loading, studio-lighting]

key-files:
  created:
    - frontend/src/pages/Stations.tsx
    - frontend/src/pages/Settings.tsx
  modified:
    - frontend/package.json
    - frontend/src/App.tsx
    - frontend/src/main.tsx
    - frontend/src/store/store.ts
    - frontend/src/components/Sidebar.tsx
    - frontend/src/components/Header.tsx
    - frontend/vite.config.ts

key-decisions:
  - decision: "Use react-router-dom v6 with lazy-loaded page components"
    rationale: "Enables URL-based navigation, code splitting, and NavLink active states"
  - decision: "Keep Zustand activeTab in sync with URL via useEffect"
    rationale: "Backward compatibility — some components still read activeTab from store"
  - decision: "Fix vite.config.ts test block (remove inline test config)"
    rationale: "vitest.config.ts already handles test config; duplicate caused build failure"

metrics:
  duration: "~15 min"
  completed: 2026-02-19
---

# Summary: 12-01 Routing, Missing Pages & Shell State

## Plan

[12-01-PLAN.md](12-01-PLAN.md)

## Status: COMPLETE

All 9 tasks completed successfully. TypeScript compiles cleanly. Production build succeeds.

## Accomplishments

### Task 1 — Install react-router-dom
- Added `react-router-dom` v6 to frontend dependencies via `npm install`

### Task 2 — Add sidebarCollapsed to Zustand Store
- Added `sidebarCollapsed: boolean` to `AppState` interface and implementation
- Added `toggleSidebar()` and `setSidebarCollapsed()` actions
- Added to `partialize` for localStorage persistence
- Created `useSidebarCollapsed` and `useToggleSidebar` selector hooks

### Task 3 — Create Stations Page
- New `frontend/src/pages/Stations.tsx` with bento grid layout
- Search bar with `useState` filtering
- 4 summary stat cards (Total, Available, Busy, Offline)
- Station list with 8 mock stations (name, address, status, power, connectors)
- Detail panel showing selected station info
- Status colors: available (emerald), busy (amber), offline (rose)
- Uses `staggerContainer`/`staggerItem` from motion.ts

### Task 4 — Create Settings Page
- New `frontend/src/pages/Settings.tsx` with bento grid layout
- 4 panels: Vehicle Profile (select), Route Preferences (3 toggles), Display (metric/imperial), API & System (endpoint + status)
- Custom `ToggleSwitch` component with emerald active state
- Save button with hover state

### Task 5 — Replace Tab Switcher with React Router
- Complete rewrite of `App.tsx` — removed `pages` record and `activeTab`-based `Page` selection
- Added `<Routes>` with 8 routes: `/`, `/dashboard`, `/routing`, `/training`, `/analytics`, `/stations`, `/settings`, `*` (catch-all)
- Lazy-loaded `StationsView` and `SettingsView` with `React.lazy` + `Suspense`
- Added studio lighting gradient: `bg-[#060910] bg-[radial-gradient(ellipse_80%_80%_at_50%_-10%,rgba(16,185,129,0.12),rgba(6,9,16,1))]`

### Task 6 — Rewire Sidebar with NavLink + Collapse Toggle
- Replaced `<button onClick>` with `<NavLink to={...}>` from react-router-dom
- Active state: `text-emerald-400 bg-white/[0.05] shadow-[inset_2px_0_0_#10b981]`
- Collapse toggle button with `PanelLeftClose` / `PanelLeft` icons from lucide
- Width transitions: `w-16` (collapsed) ↔ `w-56` (expanded) with `transition-all duration-300`
- When collapsed: hide text labels, show only centered icons
- User status dropdown hidden when collapsed
- Consumes `useSidebarCollapsed` / `useToggleSidebar` from store

### Task 7 — Update Header for URL Title
- Replaced `useActiveTab()` with `useLocation()` from react-router-dom
- Derives page title from `location.pathname.split('/')[1]`
- Header no longer depends on Zustand for page title

### Task 8 — Sync Zustand activeTab from URL
- Added `useEffect` in App.tsx that watches `useLocation()` and updates Zustand `activeTab`
- Backward compatibility: components that still read `activeTab` get correct value

### Task 9 — Verify Build + Commit
- `npx tsc --noEmit` — 0 errors
- `npm run build` — succeeds (after fixing vite.config.ts test block)
- All changes committed as single atomic commit

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed vite.config.ts inline test configuration**
- **Found during:** Task 9 (build verification)
- **Issue:** `vite.config.ts` had an inline `test:` block that caused TypeScript error TS2769 during `tsc -b` (which `npm run build` runs). The `test` property doesn't exist on Vite's `UserConfigExport` type.
- **Fix:** Removed the `test` block from `vite.config.ts` — `vitest.config.ts` already handles test configuration separately.
- **Files modified:** `frontend/vite.config.ts`
- **Verification:** `npm run build` succeeds cleanly

---

**Total deviations:** 1 auto-fixed (blocking build issue)
**Impact on plan:** Minimal — pre-existing config error, not caused by Wave 1 changes.

## Files Modified

| File | Changes |
|------|---------|
| `frontend/package.json` | Added react-router-dom dependency |
| `frontend/src/App.tsx` | Complete rewrite — Routes, lazy loading, studio lighting |
| `frontend/src/main.tsx` | Wrapped App in BrowserRouter |
| `frontend/src/store/store.ts` | sidebarCollapsed + toggleSidebar + setSidebarCollapsed |
| `frontend/src/components/Sidebar.tsx` | NavLink, collapse toggle, URL-bound active |
| `frontend/src/components/Header.tsx` | useLocation for page title |
| `frontend/src/pages/Stations.tsx` | NEW — Charging stations bento page |
| `frontend/src/pages/Settings.tsx` | NEW — Settings/config bento page |
| `frontend/vite.config.ts` | Removed inline test block |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| T1-T9 | `d006e56` | feat(12-01): routing, missing pages & shell state |

## Verification

- `tsc --noEmit` — clean (0 errors)
- `npm run build` — clean production build
- All 6 nav items route to dedicated pages
- Sidebar collapses/expands with icon-only mode
- Active nav item shows inset emerald glow
- Studio lighting gradient visible on app shell

## Next Phase Readiness

Ready for 12-02-PLAN.md — Component Interactivity & Dead Clicks Fix. All pages are routable and sidebar state is functional.
