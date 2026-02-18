---
phase: "11"
plan: "02"
subsystem: ui
tags: [sidebar, header, app-shell, navigation, zustand, framer-motion]
requires: ["11-01"]
provides: [premium-sidebar, minimal-header, bento-shell-layout]
affects: ["11-03", "11-04", "11-05"]
tech-stack:
  added: []
  patterns: [permanent-dark-mode, glass-sidebar, flat-navigation]
key-files:
  created: []
  modified: [frontend/src/App.tsx, frontend/src/components/Sidebar.tsx, frontend/src/components/Header.tsx, frontend/src/store/store.ts, frontend/src/components/ToastContainer.tsx, frontend/src/pages/Dashboard.tsx]
  deleted: [frontend/src/__tests__/PresentationMode.test.tsx, frontend/src/hooks/usePresentationMode.ts]
key-decisions:
  - Removed LazyMotion wrapper — child components use motion.* throughout (incompatible with strict mode)
  - Changed AppTab from 'route-planner' to 'routing' for consistency with nav items
  - Removed sidebar collapse/expand and mobile overlay — permanent 224px sidebar
  - Removed presentation mode entirely — not needed for demo
metrics:
  duration: "8 min"
  completed: 2026-02-18
---

# Phase 11 Plan 02: App Shell, Sidebar & Header Navigation Summary

Rebuilt the app shell to premium cockpit navigation — 224px glass sidebar with EV Routing System branding, icon+text nav items, user status section, and bottom bar. Minimal transparent header with page title and glass action buttons. Removed all theme toggling, sidebar collapse, and presentation mode.

## Accomplishments

1. **App.tsx rewritten** — Clean flex layout with Sidebar + Header + main content. Skip-to-content accessibility link. Removed PageTransition, LazyMotion, usePresentationModeEffect. Page lookup via object map.
2. **Sidebar.tsx rewritten** — 224px (`w-56`) expanded sidebar with glass bg (`bg-white/[0.02] backdrop-blur-2xl`). EV Routing System branding with ⚡ emerald logo. User status dropdown with animated green dot. 5 primary nav items (Dashboard, Map, Overview, Stations, Settings) with emerald active state. 3 secondary nav items (AI Models, Routing, Monitoring). Bottom bar with user status + settings icon.
3. **Header.tsx rewritten** — Ultra-minimal: page title left (`text-lg font-semibold text-white`), 3 small glass action buttons right (`bg-white/[0.04]`). Title auto-updates from `useActiveTab()`. Removed theme toggle, status pill, notification bell, logo badge, health polling.
4. **Store updated** — Removed `sidebarCollapsed`, `toggleSidebar`, `mobileSidebarOpen`, `setMobileSidebarOpen`, `presentationMode`, `togglePresentationMode`. Removed `useSidebar` and `usePresentationMode` selectors. Changed AppTab `'route-planner'` → `'routing'`. Added `'stations'` and `'settings'` to AppTab type.
5. **ToastContainer cleaned** — Replaced inline `style={{}}` with `bg-white/[0.04] backdrop-blur-2xl` Tailwind classes. `rounded-xl` → `rounded-2xl`.
6. **Tests updated** — Rewrote Header.test.tsx, Sidebar.test.tsx, store.test.ts to match new components. Deleted PresentationMode.test.tsx and usePresentationMode.ts hook.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] LazyMotion strict mode crash**
- **Found during:** Task 1 (App.tsx rewrite) / Checkpoint verification
- **Issue:** `LazyMotion strict` requires `m.*` imports but child components (AnimatedNumber, StatCard, GlassCard) use `motion.*` throughout the app. Runtime crash on Dashboard load.
- **Fix:** Removed LazyMotion wrapper entirely, replaced with React Fragment. `motion.*` components work fine without it.
- **Files modified:** frontend/src/App.tsx
- **Commit:** a5899e3

**2. [Rule 3 - Blocking] Broken test files and dead hook**
- **Found during:** Task 5 (ToastContainer cleanup) / TypeScript check
- **Issue:** Removing store properties (`sidebarCollapsed`, `mobileSidebarOpen`, `presentationMode`) broke 4 test files and the usePresentationMode hook.
- **Fix:** Rewrote 3 test files, deleted PresentationMode.test.tsx and usePresentationMode.ts.
- **Files modified:** 3 test files rewritten, 2 files deleted
- **Commit:** a744940

**3. [Rule 3 - Blocking] Dashboard 'route-planner' reference**
- **Found during:** Task 1 (App.tsx rewrite)
- **Issue:** Dashboard.tsx had `setActiveTab('route-planner')` but AppTab changed to `'routing'`.
- **Fix:** Updated to `setActiveTab('routing')`.
- **Files modified:** frontend/src/pages/Dashboard.tsx
- **Commit:** c6b9e78

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All fixes necessary for correctness. No scope creep.

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| frontend/src/App.tsx | Modified | Bento shell layout, removed LazyMotion |
| frontend/src/components/Sidebar.tsx | Modified | 224px premium glass sidebar |
| frontend/src/components/Header.tsx | Modified | Minimal title + action icons |
| frontend/src/store/store.ts | Modified | Removed theme/sidebar/presentation state |
| frontend/src/components/ToastContainer.tsx | Modified | Glass styling cleanup |
| frontend/src/pages/Dashboard.tsx | Modified | Fixed route-planner → routing tab |
| frontend/src/__tests__/Header.test.tsx | Modified | Tests for new header |
| frontend/src/__tests__/Sidebar.test.tsx | Modified | Tests for new sidebar |
| frontend/src/__tests__/store.test.ts | Modified | Removed sidebar/mobile tests |
| frontend/src/__tests__/PresentationMode.test.tsx | Deleted | Feature removed |
| frontend/src/hooks/usePresentationMode.ts | Deleted | Feature removed |

## Decisions Made

1. **No sidebar collapse** — Permanent 224px width matches reference image. Mobile overlay deferred to accessibility pass.
2. **No LazyMotion** — Incompatible with existing `motion.*` usage across 20+ components. Would require touching every animated component to switch to `m.*` imports.
3. **Routing tab rename** — `'route-planner'` → `'routing'` for cleaner ID that matches nav label conventions.

## Issues Encountered

None — all deviations resolved during execution.

## Next Phase Readiness

Ready for 11-03-PLAN.md (Interactive Primitives & Micro-Animations). The app shell is stable with new navigation. TypeScript compiles clean.
