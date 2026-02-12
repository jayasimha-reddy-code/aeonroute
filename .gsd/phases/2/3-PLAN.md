---
phase: 2
plan: 3
wave: 2
---

# Plan 2.3: Bundle Analysis & Dead Code Elimination

## Objective
Measure the current bundle size, identify the largest dependencies, and eliminate unnecessary code to meet the < 500KB gzipped target from the spec.

## Context
- .gsd/SPEC.md — NFR-01 (bundle < 500KB gzipped)
- frontend/package.json — current dependencies
- frontend/vite.config.ts — Vite build configuration

## Tasks

<task type="auto">
  <name>Run bundle analysis and document baseline</name>
  <files>
    frontend/vite.config.ts
    .gsd/BASELINES.md
  </files>
  <action>
    1. Install `rollup-plugin-visualizer` as a dev dependency
    2. Add the visualizer plugin to vite.config.ts (output: stats.html, gzip sizes)
    3. Run `npm run build` and capture output sizes
    4. Document the baseline bundle sizes in .gsd/BASELINES.md:
       - Total JS (raw + gzipped)
       - Total CSS (raw + gzipped)
       - Top 5 largest dependencies by size
       - Number of chunks produced
    5. Open stats.html to verify the treemap renders
  </action>
  <verify>npm run build (succeeds, stats.html generated)</verify>
  <done>BASELINES.md contains documented bundle sizes. stats.html exists with dependency treemap.</done>
</task>

<task type="auto">
  <name>Optimize Vite build configuration</name>
  <files>frontend/vite.config.ts</files>
  <action>
    1. Configure manual chunks to separate large dependencies:
       - `react-vendor`: react, react-dom
       - `chart-vendor`: recharts
       - `map-vendor`: leaflet, react-leaflet
    2. Enable CSS code splitting
    3. Set build target to es2020 (modern browsers per spec)
    4. Do NOT remove any dependencies — only optimize how they're chunked
  </action>
  <verify>npm run build (succeeds, shows separate vendor chunks)</verify>
  <done>Build output shows react-vendor, chart-vendor, map-vendor as separate chunks. Total gzipped JS documented.</done>
</task>

## Success Criteria
- [ ] Bundle sizes documented in BASELINES.md
- [ ] Vendor libraries split into separate chunks for better caching
- [ ] Build succeeds with no errors
- [ ] Total gzipped JS + CSS is measured against 500KB target
