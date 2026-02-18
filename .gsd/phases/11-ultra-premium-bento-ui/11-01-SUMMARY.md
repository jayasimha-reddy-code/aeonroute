---
phase: 11-ultra-premium-bento-ui
plan: 01
subsystem: ui
tags: [tailwind, css, design-tokens, dark-mode, glassmorphism, bento-grid]

requires:
  - phase: 03-design-system-ui-polish
    provides: Original CSS variable system and tailwind config
  - phase: 09-ui-polish-bug-fixes
    provides: Existing component styling (to be replaced)
provides:
  - Flat design token system in tailwind.config.ts (midnight, surface, emerald/amber/cyan/rose/blue)
  - Permanent dark mode (no theme toggling)
  - Glass utility classes (.glass, .glass-hover)
  - Radial gradient overlay in index.html
  - Clean codebase with zero dark: prefixes and zero var(-- references
affects:
  - phase: 11-02
    needs: Design tokens and glass utilities for App Shell rebuild
  - phase: 11-03
    needs: Token system for interactive primitives
  - phase: 11-04
    needs: Midnight background and emerald accents for map overhaul
  - phase: 11-05
    needs: Full token system for page compositions

tech-stack:
  added: []
  patterns: [flat-design-tokens, permanent-dark-mode, glass-utility-classes, radial-gradient-overlay]

key-files:
  created: []
  modified:
    - frontend/src/index.css
    - frontend/tailwind.config.ts
    - frontend/index.html
    - frontend/src/store/store.ts
    - frontend/src/hooks/useMapTheme.ts
    - frontend/src/App.tsx
    - frontend/src/components/** (26+ files)
    - frontend/src/__tests__/store.test.ts
    - frontend/src/__tests__/Header.test.tsx

key-decisions:
  - "Nuked index.css from 1,211 to ~130 lines — all color authority moved to tailwind.config.ts"
  - "Surface tokens use rgba white (0.02/0.04/0.06/0.08) not named colors — true translucency"
  - "Text hierarchy: label (slate-300), muted (slate-400/500), faint (slate-600) — not semantic names"
  - "Glass plugin in tailwind adds bg/backdrop-blur/border/shadow as single utility"
  - "Hardcoded class='dark' on html element — no runtime theme switching"
  - "useMapTheme always returns DARK_STYLE — isDarkMode: true stub for compatibility"

patterns-established:
  - "All colors defined as flat tokens in tailwind.config.ts, never in CSS"
  - "Glass surfaces: bg-white/[0.02] backdrop-blur-2xl border-white/[0.05] rounded-2xl"
  - "Accent dims: emerald/10, amber/10 etc. for subtle backgrounds"
  - "No dark: prefix anywhere — permanent dark mode assumed"

duration: ~25min
completed: 2026-02-19
---

# Plan 11-01: Core CSS Tokens, Design System & Bento Grid Setup Summary

**Nuked 1,211-line CSS variable system and replaced with flat Tailwind design tokens — permanent dark mode on midnight slate (#0a0f16) with ultra-translucent glass surfaces and neon accent palette**

## Performance

- **Duration:** ~25 min
- **Tasks:** 5/5 (+ 1 checkpoint)
- **Files modified:** 30+

## Accomplishments

- Nuked index.css from 1,211 lines to ~130 lines — zero CSS custom properties remain, all color authority in tailwind.config.ts
- Rewrote tailwind.config.ts from 294 lines to ~130 lines with flat design tokens: midnight bg, surface rgba variants, emerald/amber/cyan/rose/blue accents with dim variants, label/muted/faint text hierarchy, glow shadows, radial backgrounds, glass plugin
- Hardcoded dark mode in index.html — removed FOUC prevention script, set class="dark", added color-scheme meta tag, radial-glow overlay div
- Stripped all theme toggling from store.ts (ThemeMode type, themeMode/isDarkMode/cycleTheme/setThemeMode), useMapTheme.ts (always returns DARK_STYLE), and App.tsx (removed useTheme, dark mode effects)
- Global search-and-destroy across 26+ component files: removed all dark: prefixes, replaced var(-- references, replaced old color scales (slate-800, gray-900 etc.) with new tokens (surface, midnight, emerald, label, muted)
- Updated test files (store.test.ts, Header.test.tsx) to remove theme-related assertions

## Task Commits

Each task was committed atomically:

1. **Task 1: Nuke index.css to under 200 lines** — `2a80d11` (feat)
2. **Task 2: Rewrite tailwind.config.ts with flat design tokens** — `cddfbc2` (feat)
3. **Task 3: Hardcode dark mode in index.html** — `ef4bb73` (feat)
4. **Task 4: Strip theme toggling from store, hooks, App.tsx** — `26c2877` (feat)
5. **Task 5: Global search-and-destroy dark:/var(-- across codebase** — `810ff4d` (feat)

## Files Created/Modified

- `frontend/src/index.css` — Nuked to ~130 lines: base layer, glass components, keyframes, MapLibre overrides
- `frontend/tailwind.config.ts` — Rewritten: flat color tokens, glow shadows, radial backgrounds, glass plugin
- `frontend/index.html` — Hardcoded dark mode, radial overlay div, removed FOUC script
- `frontend/src/store/store.ts` — Removed ThemeMode, themeMode, isDarkMode, cycleTheme, setThemeMode, useTheme
- `frontend/src/hooks/useMapTheme.ts` — Simplified to always return DARK_STYLE
- `frontend/src/App.tsx` — Removed theme effects, simplified to flex h-screen bg-midnight
- `frontend/src/components/map/NetworkEdgesLayer.tsx` — Removed isDarkMode param, hardcoded dark colors
- `frontend/src/components/map/MapView.tsx` — Removed isDarkMode destructuring
- `frontend/src/components/**` — 26+ files: dark: prefixes removed, old tokens replaced
- `frontend/src/__tests__/store.test.ts` — Removed theme assertions
- `frontend/src/__tests__/Header.test.tsx` — Removed theme toggle test

## Decisions Made

- Surface tokens use rgba white for true translucency rather than named opaque colors
- Kept useMapTheme returning isDarkMode: true for API compatibility with MapView
- Glass utility implemented as Tailwind plugin rather than CSS class for composability
- Text hierarchy uses label/muted/faint naming convention (visual weight, not semantic)

## Deviations from Plan

None — all 5 tasks executed as specified.

## Verification

- `npx tsc --noEmit` — 0 errors
- `grep -r "dark:" frontend/src/` — 0 matches in source files
- `grep -r "var(--" frontend/src/` — 0 matches
- DevTools inspection confirmed: correct HTML structure, radial overlay, midnight background
- Checkpoint approved by user after visual verification

## Next Plan Readiness

Ready for 11-02-PLAN.md — App Shell & Navigation rebuild. All design tokens and glass utilities are in place.
