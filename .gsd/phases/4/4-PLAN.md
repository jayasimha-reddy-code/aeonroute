---
phase: 4
plan: 4
wave: 2
---

# Plan 4.4: Component Surfaces — Cards, Buttons, Toasts, Map ARIA

## Objective
Upgrade card, button, toast, and map components to use glass tokens, improved focus states, and ARIA attributes per the Phase 4 SPEC.

## Context
- .gsd/phases/4/SPEC.md (§2.1 Cards, §2.2 Buttons, §2.5 Toasts, §2.6 Map)
- frontend/src/index.css (.card, .btn, toast styles)
- frontend/src/components/ToastContainer.tsx
- frontend/src/components/NetworkMap.tsx

## Tasks

<task type="auto">
  <name>Upgrade card and button CSS classes</name>
  <files>frontend/src/index.css</files>
  <action>
    1. UPDATE `.card` class (lines 190-201):
       - Replace `background: var(--color-surface-raised)` with `background: var(--glass-bg)`
       - Add `backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate))`
       - Add `-webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate))`
       - Replace `border: 1px solid var(--color-border)` with `border: 1px solid var(--glass-border)`
       
    2. UPDATE `.dark .card` (lines 203-210):
       - Replace `background: rgba(30, 41, 59, 0.5)` with `background: var(--glass-bg)`
       - Replace `border-color: var(--color-border)` with `border-color: var(--glass-border)`
       - ADD `inset 0 1px 0 rgba(255, 255, 255, 0.04)` to existing box-shadow
       
    3. ADD after `.card-interactive:active` (line 237):
       ```css
       .card-interactive:focus-visible {
         outline: 2px solid var(--focus-ring);
         outline-offset: var(--focus-ring-offset);
       }
       ```
       
    4. UPDATE `.btn:focus-visible` (lines 345-348):
       - Replace `outline: 2px solid var(--color-primary)` with:
         `outline: none; box-shadow: 0 0 0 3px var(--focus-ring);`
       
    5. UPDATE `.btn:disabled` (lines 350-352):
       - Add `filter: grayscale(30%)` alongside existing opacity
       - Change `opacity-50` to `opacity-40`
       
    6. ADD new `.btn-loading` class after `.btn-danger:hover` (after line 464):
       ```css
       .btn-loading {
         pointer-events: none;
         opacity: 0.7;
         cursor: wait;
       }
       ```
    
    7. Ensure ALL button variants have minimum height 44px for touch targets:
       - `.btn-sm`: add `min-h-[36px]` (allowed exception for small buttons)
       - `.btn-md`: add `min-h-[44px]`
       - `.btn-lg`: add `min-h-[48px]`
  </action>
  <verify>npm run build (success)</verify>
  <done>
    - .card uses --glass-bg, --glass-border, backdrop-filter
    - .dark .card uses token-driven colors with inner highlight
    - .card-interactive has :focus-visible ring
    - .btn:focus-visible uses box-shadow ring (not outline)
    - .btn:disabled has grayscale filter
    - .btn-loading class exists
    - Button sizes have minimum height for touch targets
  </done>
</task>

<task type="auto">
  <name>Toast ARIA + Map container ARIA and styling</name>
  <files>frontend/src/components/ToastContainer.tsx, frontend/src/components/NetworkMap.tsx</files>
  <action>
    **ToastContainer.tsx:**
    1. Wrap the toast list container `<div>` with `aria-live="polite"` and `aria-label="Notifications"`
    2. Individual toasts: set `role="alert"` for error/warning types, `role="status"` for info/success types
    3. Add a progress bar: a thin `<div>` at the bottom of each toast that shrinks from 100% to 0% width over the toast's duration using CSS animation
       - Height: 2px, background: var(--color-primary), position: absolute bottom
       - Animation: `@keyframes toastProgress { from { width: 100%; } to { width: 0%; } }` with duration matching toast.duration
    4. Apply glass background to toast cards: use `var(--glass-bg)` + backdrop-filter
    
    **NetworkMap.tsx:**
    1. Add to the map container div: `role="application"`, `aria-label="EV route map"`, `aria-roledescription="Interactive map"`
    2. Add border + shadow styling using token classes: `border border-[var(--glass-border)] rounded-2xl shadow-card overflow-hidden`
    
    Do NOT change any map logic, markers, or routing behavior.
  </action>
  <verify>npx tsc --noEmit (0 errors)</verify>
  <done>
    - Toast container has aria-live="polite" and aria-label
    - Toast role varies by type (alert vs status)
    - Progress bar animation visible on each toast
    - Toast cards use glass surface
    - Map has role="application", aria-label, aria-roledescription
    - Map container has border, radius, and shadow
  </done>
</task>

## Success Criteria
- [ ] Cards render with glass surface (backdrop-blur visible through translucency)
- [ ] Buttons have visible focus ring, disabled grayscale, loading state
- [ ] Toasts show progress bar, use glass bg, correct ARIA roles
- [ ] Map container has ARIA attributes and styled border
- [ ] TypeScript compiles with 0 errors
- [ ] Build succeeds, gzip ≤ 170 kB
