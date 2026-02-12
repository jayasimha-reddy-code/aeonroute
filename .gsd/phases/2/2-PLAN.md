---
phase: 2
plan: 2
wave: 1
---

# Plan 2.2: Component Memoization & Re-render Prevention

## Objective
Apply React.memo, useMemo, and useCallback strategically to heavy components that re-render on unrelated state changes. Target the components that access the Zustand store broadly.

## Context
- .gsd/SPEC.md — NFR-01 (interaction delay < 100ms)
- frontend/src/store/store.ts — selector hooks created in Phase 1
- frontend/src/pages/Dashboard.tsx
- frontend/src/pages/RoutePlanner.tsx
- frontend/src/pages/Analytics.tsx
- frontend/src/components/Header.tsx
- frontend/src/components/Sidebar.tsx
- frontend/src/components/NetworkMap.tsx

## Tasks

<task type="auto">
  <name>Migrate components to use selector hooks</name>
  <files>
    frontend/src/pages/Dashboard.tsx
    frontend/src/pages/RoutePlanner.tsx
    frontend/src/pages/Training.tsx
    frontend/src/pages/Analytics.tsx
    frontend/src/components/Header.tsx
    frontend/src/components/Sidebar.tsx
    frontend/src/App.tsx
  </files>
  <action>
    For each component listed:
    1. Replace `useSystemStore((s) => s.someField)` calls with the Phase 1 selector hooks:
       - `useActiveTab()` instead of `useSystemStore((s) => s.activeTab)`
       - `useTheme()` instead of `useSystemStore((s) => ({ isDarkMode: s.isDarkMode, ... }))`
       - `useRoadNetwork()` instead of `useSystemStore((s) => s.roadNetwork)`
       - `useSidebar()` instead of `useSystemStore((s) => s.sidebarCollapsed)`
       - `useRoutes()` for route-related state
       - `useEVState()` for EV state
       - `useAddToast()` for toast dispatch
    2. Wrap expensive callbacks (like route generation, network fetching) with useCallback
    3. Do NOT change any component behavior or API
    4. Do NOT rename any exports
  </action>
  <verify>npx tsc --noEmit && npx vitest run src/__tests__/store.test.ts</verify>
  <done>All components import from selector hooks. TypeScript compiles. Store tests pass.</done>
</task>

<task type="auto">
  <name>Memoize heavy render components</name>
  <files>
    frontend/src/components/NetworkMap.tsx
    frontend/src/components/StatCard.tsx
    frontend/src/components/RouteCard.tsx
  </files>
  <action>
    1. Wrap NetworkMap with React.memo (it receives roadNetwork as prop — only re-render when network changes)
    2. Wrap StatCard with React.memo (pure presentational component)
    3. Wrap RouteCard with React.memo (only re-render when route data changes)
    4. Use useMemo for any expensive derived data (e.g., node position calculations in NetworkMap)
    5. Add displayName to memoized components for React DevTools
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>NetworkMap, StatCard, RouteCard are wrapped in React.memo. TypeScript compiles.</done>
</task>

## Success Criteria
- [ ] All components use granular selector hooks instead of broad store access
- [ ] Heavy components (NetworkMap, StatCard, RouteCard) are memoized
- [ ] TypeScript compiles with no errors
- [ ] Store tests still pass (no regressions)
