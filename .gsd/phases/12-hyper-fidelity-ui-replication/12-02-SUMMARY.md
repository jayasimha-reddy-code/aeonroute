---
phase: 12-hyper-fidelity-ui-replication
plan: 02
subsystem: ui
tags: [interactivity, dropdowns, overflow-menu, toggles, dead-clicks, useState, outside-click]

requires:
  - phase: 12-01
    provides: All 6 pages routable, sidebar collapse, studio lighting
provides:
  - Reusable OverflowMenu component with local useState open/close
  - All "..." buttons wired to render dropdown menus
  - View toggle buttons (Fast/Eco/Scenic, Grid/List) swapping visual state
  - Hoverable interactive rows in Recent Activity
  - Date range picker dropdown in Analytics header
  - Header action buttons wired to functional state

affects:
  - phase: 12-03
    needs: Interactive chart containers with overflow menus for export/refresh
  - phase: 12-04
    needs: Glass-material card upgrades apply to all interactive components
  - phase: 12-05
    needs: Hover/click states for Framer Motion micro-interactions

tech-stack:
  added: []
  patterns: [local-useState-dropdown, controlled-toggle, outside-click-dismiss, escape-key-dismiss]

key-files:
  created:
    - frontend/src/components/ui/OverflowMenu.tsx
    - frontend/src/components/ui/ViewToggle.tsx
  modified:
    - frontend/src/components/StatCard.tsx
    - frontend/src/components/Header.tsx
    - frontend/src/pages/Dashboard.tsx
    - frontend/src/pages/RoutePlanner.tsx
    - frontend/src/pages/Analytics.tsx
    - frontend/src/components/ui/index.ts

key-decisions:
  - Used local useState per dropdown instead of global store — keeps state isolated and composable
  - Outside-click dismiss via useRef + mousedown listener — standard React pattern
  - OverflowMenu uses group-hover opacity reveal — inherits parent card hover state

metrics:
  duration: ~5 min
  completed: 2026-02-19
---

# Phase 12 Plan 02: Component Interactivity & Dead Clicks Fix — Summary

Eliminated every dead click in the UI by creating reusable interactive primitives (OverflowMenu, ViewToggle) and wiring them into all pages. Every "..." button now opens a glass dropdown, pill toggles swap active state, activity rows are hoverable, and Analytics has a date range picker.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| T1 | Create OverflowMenu component | 58c1a3c | ✅ |
| T2 | Create ViewToggle pill component | 58c1a3c | ✅ |
| T3 | Wire OverflowMenu into StatCard | ea3bb2f | ✅ |
| T4 | Make Dashboard activity rows interactive | 6eef3ac | ✅ |
| T5 | Add Fast/Eco/Scenic route toggle | eb34dca | ✅ |
| T6 | Wire Header grid/list toggles | bfc08ca | ✅ |
| T7 | Add date range selector to Analytics | 8e1b108 | ✅ |
| T8 | Add OverflowMenu to Analytics chart cards | 8e1b108 | ✅ |
| T9 | Export from UI barrel | 155c3e9 | ✅ |

**Tasks completed: 9/9**

## Components Created

### OverflowMenu (`frontend/src/components/ui/OverflowMenu.tsx`)
- Glass dropdown: `bg-[#0f141c] border-white/10 backdrop-blur-3xl shadow-2xl z-50`
- Trigger: opacity-0 → group-hover:opacity-100 MoreHorizontal icon
- Dismiss: outside click (useRef + mousedown) + Escape key
- Configurable items with icon, label, onClick, variant (default/danger)

### ViewToggle (`frontend/src/components/ui/ViewToggle.tsx`)
- Pill-shaped toggle with emerald neon active / ghost inactive styling
- Active: `bg-emerald/20 text-emerald shadow-[0_0_12px_rgba(16,185,129,0.2)]`
- Inactive: `text-label hover:text-white hover:bg-white/[0.04]`
- Generic `<T extends string>` for type-safe value tracking
- Supports sm/md sizes and optional icons

## Dead Clicks Fixed

| Location | Element | Before | After |
|----------|---------|--------|-------|
| StatCard | "..." button | Decorative icon | OverflowMenu with 3 actions |
| Dashboard | Recent Activity "..." | Decorative icon | OverflowMenu with 3 actions |
| Dashboard | Activity rows | Static divs | Hoverable buttons with onClick |
| Route Planner | Route type | No toggle | Fast/Eco/Scenic ViewToggle |
| Header | Grid/List buttons | Decorative | Exclusive toggle with emerald active |
| Analytics | Date range | Not present | Dropdown with 7d/30d/90d/All |
| Analytics | Energy chart | No menu | OverflowMenu (Export/Refresh/Fullscreen) |
| Analytics | Route Quality chart | No menu | OverflowMenu (Export/Refresh/Fullscreen) |
| Analytics | GAN Quality chart | No menu | OverflowMenu (Export/Refresh/Fullscreen) |
| Analytics | Training Loss chart | No menu | OverflowMenu (Export/Refresh/Fullscreen) |

**Total dead clicks eliminated: 10+**

## Files Created/Modified

**Created:**
- `frontend/src/components/ui/OverflowMenu.tsx` — Reusable dropdown menu
- `frontend/src/components/ui/ViewToggle.tsx` — Pill-shaped toggle

**Modified:**
- `frontend/src/components/StatCard.tsx` — Replaced MoreHorizontal with OverflowMenu
- `frontend/src/components/Header.tsx` — Added viewMode state, emerald active toggle
- `frontend/src/pages/Dashboard.tsx` — OverflowMenu on Recent Activity, hoverable rows
- `frontend/src/pages/RoutePlanner.tsx` — ViewToggle for Fast/Eco/Scenic
- `frontend/src/pages/Analytics.tsx` — Date range picker, 4x chart OverflowMenus
- `frontend/src/components/ui/index.ts` — Barrel exports for new components

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `Bolt` icon not available in lucide-react**
- **Found during:** Task 5 (Route type toggle)
- **Issue:** Plan specified `Bolt` icon but lucide-react exports it as `Zap` (or doesn't have `Bolt`)
- **Fix:** Used `Zap` icon instead — semantically equivalent for "fastest"
- **Verification:** TypeScript compiles with zero errors
- **Commit:** eb34dca

**Total deviations:** 1 auto-fixed (blocking)
**Impact on plan:** Trivial icon substitution, no scope change.

## Decisions Made

None beyond plan specification.

## Issues Encountered

None.

## Verification

- TypeScript: `tsc --noEmit` — 0 errors ✅
- Vite build: `vite build` — succeeds in 18.5s ✅
- All dropdowns use local useState + outside-click dismiss ✅
- All pill toggles swap active emerald / ghost inactive ✅
- Activity rows have `hover:bg-white/[0.02] cursor-pointer` ✅

## Next Phase Readiness

Ready for 12-03-PLAN.md — Chart Upgrades & Data Visualization. All interactive containers are in place with overflow menus for export/refresh actions. Charts are ready for gradient fill and glow effect upgrades.
