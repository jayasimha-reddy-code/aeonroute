---
phase: 3
plan: 1
wave: 1
---

# Plan 3.1: Toast & Page Transition Animations

## Objective
Add polished enter/exit animations to toasts and smooth page transitions using the motion tokens and exit keyframes established in Phase 1.

## Context
- .gsd/SPEC.md — NFR-03 (Animation System)
- frontend/src/index.css — motion tokens (`--motion-*`), exit keyframes
- frontend/src/components/ToastContainer.tsx — currently uses `animate-slide-in-right`, no exit animation
- frontend/src/App.tsx — currently uses `animate-fade-in` on tab switch (key={activeTab})

## Tasks

<task type="auto">
  <name>Add toast exit animation with dismissal state</name>
  <files>frontend/src/components/ToastContainer.tsx</files>
  <action>
    1. Add a local `dismissing` state (Set of toast IDs currently exiting)
    2. When removeToast is called, add the toast ID to `dismissing` set first
    3. Apply `animate-slide-out-right` class to dismissing toasts
    4. After animation duration (var(--motion-duration-normal) = 250ms), actually remove from store
    5. Keep the existing `animate-slide-in-right` for enter
    6. Use `onAnimationEnd` event to trigger actual removal (more reliable than setTimeout)
    7. Migrate from `useSystemStore` to `useToasts` selector hook
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>Toasts slide in on creation and slide out on dismissal. TypeScript compiles.</done>
</task>

<task type="auto">
  <name>Polish page transition with cross-fade</name>
  <files>frontend/src/index.css</files>
  <action>
    1. Add a `pageEnter` keyframe that combines fade + subtle upward translate:
       - from: { opacity: 0, transform: translateY(8px) }
       - to: { opacity: 1, transform: translateY(0) }
       - duration: var(--motion-duration-normal), easing: var(--motion-easing-expo-out)
    2. Add `.animate-page-enter` class using the new keyframe
    3. This replaces the generic `animate-fade-in` on page switches for a more premium feel
    4. Ensure it respects prefers-reduced-motion (already handled by the global media query)
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>Page transitions use a fade+slide-up effect. CSS compiles. prefers-reduced-motion respected.</done>
</task>

## Success Criteria
- [ ] Toasts animate in (slide-in-right) and out (slide-out-right) smoothly
- [ ] Page transitions use fade+translate-up instead of plain fade
- [ ] TypeScript compiles with no errors
- [ ] prefers-reduced-motion disables all animations
