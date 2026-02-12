---
phase: 2
plan: 1
wave: 1
---

# Plan 2.1: Route Code-Splitting & Suspense Boundaries

## Objective
Lazy-load all four page routes (Dashboard, RoutePlanner, Training, Analytics) so only the active page's code is downloaded. This reduces initial bundle size and improves Largest Contentful Paint (LCP). Adds Suspense fallback with a premium loading skeleton.

## Context
- .gsd/SPEC.md — NFR-01 (bundle < 500KB gzipped), NFR-02 (skeleton states)
- frontend/src/App.tsx — current eager-loaded routes
- frontend/src/index.css — skeleton styles already defined

## Tasks

<task type="auto">
  <name>Create PageLoader skeleton component</name>
  <files>frontend/src/components/ui/PageLoader.tsx</files>
  <action>
    Create a full-page skeleton loader component that:
    - Renders a card-skeleton layout matching the page structure
    - Uses the existing `.skeleton-shimmer` CSS class from index.css
    - Has proper aria-label="Loading page content"
    - Matches the glassmorphism card style from the design system
    - Animates with the shimmer effect
    - Respects prefers-reduced-motion (shimmer already disabled by the media query)
  </action>
  <verify>npx tsc --noEmit (TypeScript compiles)</verify>
  <done>PageLoader.tsx exists, exports default, renders skeleton DOM, passes TypeScript check</done>
</task>

<task type="auto">
  <name>Convert pages to lazy-loaded routes</name>
  <files>frontend/src/App.tsx</files>
  <action>
    1. Replace static imports of Dashboard, RoutePlanner, Training, Analytics with `React.lazy(() => import(...))`
    2. Wrap the page render area with `<Suspense fallback={<PageLoader />}>`
    3. Keep Header and Sidebar outside Suspense (they load immediately)
    4. Do NOT change any route logic or tab switching behavior
    5. Verify existing `useSystemStore` usage still works (it should — lazy loading only affects when the component JS is fetched)
  </action>
  <verify>npm run build && ls -la dist/assets/*.js (should show multiple chunk files instead of one bundle)</verify>
  <done>Build output shows at least 5 JS chunks (vendor + 4 page chunks). App still navigates between all 4 pages correctly.</done>
</task>

## Success Criteria
- [ ] `npm run build` produces separate chunks for each page
- [ ] Initial JS bundle (vendor + app shell) is measurably smaller than before
- [ ] Page navigation still works (tab switching loads lazy chunks)
- [ ] Loading state shows skeleton (not blank) while chunk loads
