---
phase: 3
plan: 3
wave: 2
---

# Plan 3.3: Map Marker & Route Animations

## Objective
Polish the Leaflet map layer with animated markers (bounce-in for waypoints, refined charge pulse) and animated route drawing that feels alive and premium.

## Context
- .gsd/SPEC.md — NFR-03 (map markers bounce-in, charge pulse, route drawing)
- frontend/src/index.css — `.charge-pulse` animation exists, route path animations
- frontend/src/components/NetworkMap.tsx — Leaflet map rendering (memoized)

## Tasks

<task type="auto">
  <name>Refine charge station pulse animation</name>
  <files>frontend/src/index.css</files>
  <action>
    1. Enhance the existing `.charge-pulse` CSS class:
       - Use a smoother 2-stage pulse: scale 1→1.4→1 with opacity 0.3→0.1→0.3
       - Duration: 2s, infinite, ease-in-out
       - Add a subtle box-shadow glow that pulses with the scale
    2. Add `.marker-bounce-in` keyframe for source/destination markers:
       - 0%: { transform: scale(0), opacity: 0 }
       - 60%: { transform: scale(1.2) }
       - 100%: { transform: scale(1), opacity: 1 }
       - Duration: var(--motion-duration-slow, 400ms), easing: var(--motion-easing-spring)
    3. Add `.route-draw` keyframe for animated route polylines:
       - Animate stroke-dashoffset from 100% to 0 (line drawing effect)
       - Duration: 1.5s, ease-in-out
    4. Ensure all respect prefers-reduced-motion
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>Charge pulse refined. Bounce-in keyframe available. Route drawing animation ready. All accessible.</done>
</task>

<task type="checkpoint:human-verify">
  <name>Visual verification of all Phase 3 animations</name>
  <files>N/A</files>
  <action>
    1. Start the dev server: npm run dev
    2. Verify: toasts slide in from right and slide out on dismiss
    3. Verify: page transitions use fade+slide-up effect
    4. Verify: card hover shows subtle glow
    5. Verify: map charge stations pulse smoothly
    6. Share screenshots/recording in walkthrough
  </action>
  <verify>Manual visual inspection in browser</verify>
  <done>All animations verified visually. Walkthrough contains proof.</done>
</task>

## Success Criteria
- [ ] Charge station pulse is smooth 2-stage with glow
- [ ] Marker bounce-in keyframe defined and accessible
- [ ] Route drawing animation defined
- [ ] All animations respect prefers-reduced-motion
- [ ] Visual verification confirms smooth 60fps animations
