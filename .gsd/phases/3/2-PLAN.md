---
phase: 3
plan: 2
wave: 1
---

# Plan 3.2: Card Hover Effects & Loading Polish

## Objective
Elevate card interactions with premium hover micro-interactions and smooth skeleton→content transitions for loading states.

## Context
- .gsd/SPEC.md — NFR-02 (skeleton states), NFR-03 (card hover, data refresh)
- frontend/src/index.css — design system, `.card` class
- frontend/src/components/StatCard.tsx — uses `.card` + basic hover
- frontend/src/components/RouteCard.tsx — uses `.card` + basic hover
- frontend/src/components/ui/Skeleton.tsx — skeleton components

## Tasks

<task type="auto">
  <name>Enhance card hover micro-interactions</name>
  <files>frontend/src/index.css</files>
  <action>
    1. Enhance the existing `.card` class with premium hover effects:
       - `hover:shadow-lg` → upgrade to a subtle glow using box-shadow with primary color tint
       - Add smooth `transition: all var(--motion-duration-normal) var(--motion-easing-standard)`
       - Ensure the card border subtly lightens on hover in dark mode
    2. Add a `.card-interactive` modifier class for clickable cards:
       - `cursor: pointer`
       - `hover:scale-[1.015]` (very subtle scale, less than StatCard's 1.02)
       - `active:scale-[0.985]` (press feedback per NFR-03)
    3. Do NOT change existing Tailwind utility classes on StatCard/RouteCard — the CSS class enhancement will apply automatically
  </action>
  <verify>npx tsc --noEmit (CSS doesn't affect TS but ensures nothing broke)</verify>
  <done>`.card` hover has glow effect. `.card-interactive` provides click feedback. Transitions use motion tokens.</done>
</task>

<task type="auto">
  <name>Add skeleton-to-content transition</name>
  <files>
    frontend/src/components/ui/Skeleton.tsx
    frontend/src/index.css
  </files>
  <action>
    1. In index.css, add a `.content-reveal` keyframe:
       - from: { opacity: 0, filter: blur(4px) }
       - to: { opacity: 1, filter: blur(0) }
       - duration: var(--motion-duration-normal), easing: var(--motion-easing-standard)
    2. Add `.animate-content-reveal` utility class
    3. In Skeleton.tsx, ensure skeleton components use the existing shimmer animation
    4. The content-reveal class can be applied by page components when data loads (pattern: show skeleton → data arrives → show content with .animate-content-reveal)
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>CSS `content-reveal` keyframe exists. Skeleton shimmer works. Pages can apply `.animate-content-reveal` on data load.</done>
</task>

## Success Criteria
- [ ] Cards have premium hover glow + press feedback
- [ ] `.card-interactive` class available for clickable cards
- [ ] Content reveal animation ready for skeleton→content transitions
- [ ] All transitions use Phase 1 motion tokens
