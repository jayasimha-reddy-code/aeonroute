---
phase: 4
plan: 5
wave: 3
---

# Plan 4.5: Accessibility Hardening — Skip Link, Contrast Fixes, Reduced Motion

## Objective
Close remaining WCAG AA gaps: skip navigation link, color contrast fixes for muted text and primary-as-text usage, expanded reduced-motion rules, and global focus-visible enhancement.

## Context
- .gsd/phases/4/SPEC.md (§4 Accessibility Requirements)
- frontend/src/index.css (focus states, reduced motion block)
- frontend/src/App.tsx (skip link target)

## Tasks

<task type="auto">
  <name>Add skip navigation link + contrast fixes</name>
  <files>frontend/src/App.tsx, frontend/src/index.css</files>
  <action>
    **App.tsx:**
    1. Add a skip link as the FIRST child inside the outermost container div:
       ```tsx
       <a href="#main-content" className="skip-link">
         Skip to main content
       </a>
       ```
    2. Add `id="main-content"` to the `<main>` element
    
    **index.css:**
    1. Add `.skip-link` class in `@layer components`:
       ```css
       .skip-link {
         position: absolute;
         top: -100%;
         left: 16px;
         z-index: 9999;
         padding: 12px 24px;
         background: var(--color-primary);
         color: white;
         font-weight: 600;
         font-size: 0.875rem;
         border-radius: var(--radius-lg);
         text-decoration: none;
         transition: top 150ms ease;
       }
       .skip-link:focus {
         top: 16px;
         outline: none;
         box-shadow: 0 0 0 3px var(--focus-ring);
       }
       ```
    
    2. FIX contrast: Update `--color-text-muted` in `:root` from `#94A3B8` to `#6B7280` (passes 4.5:1 on white)
    3. In `.dark`, update `--color-text-muted` from `#64748B` to `#8B95A5` (passes 4.5:1 on #0B1120)
    4. VERIFY: Anywhere `primary-500` is used as text on white background, check usage. Known location: subtitle in Header.tsx uses `text-primary-600/60` — this is fine (decorative, small text). No changes needed if all primary text uses 600+ shade.
  </action>
  <verify>npx tsc --noEmit (0 errors)</verify>
  <done>
    - Skip link renders visually hidden, appears on Tab focus
    - Skip link jumps to <main id="main-content">
    - --color-text-muted passes 4.5:1 contrast ratio in both modes
    - No primary-500 used as regular body text on white
  </done>
</task>

<task type="auto">
  <name>Expanded reduced-motion + global focus-visible ring</name>
  <files>frontend/src/index.css</files>
  <action>
    1. UPDATE the existing `@media (prefers-reduced-motion: reduce)` block (lines 877-899):
       - Keep existing rules for *, *::before, *::after
       - ADD explicit rules:
         ```css
         /* Opacity transitions are ok, but keep them short */
         *:not(.skip-link) {
           transition-property: opacity, color, background-color, border-color !important;
         }
         
         /* No transforms on hover/active */
         .card-interactive:hover,
         .card-interactive:active,
         .btn:active:not(:disabled),
         .btn-primary:hover:not(:disabled),
         .btn-accent:hover:not(:disabled),
         .btn-danger:hover:not(:disabled) {
           transform: none !important;
         }
         
         /* Page transitions: opacity only */
         .animate-page-enter {
           animation: none !important;
           opacity: 1 !important;
         }
         
         /* Skeleton shimmer static */
         .skeleton-shimmer::after {
           animation: none !important;
           transform: none !important;
         }
         ```
    
    2. UPDATE the global `*:focus-visible` rule (lines 127-130):
       - Replace with:
         ```css
         *:focus-visible {
           outline: 2px solid var(--focus-ring);
           outline-offset: var(--focus-ring-offset);
         }
         ```
       This uses tokens instead of hardcoded `var(--color-primary)`.
    
    3. ADD hover-only media query wrapper for transform-based hover effects:
       In `@layer components`, wrap card hover transforms:
       ```css
       @media (hover: hover) {
         .card-interactive:hover {
           transform: scale(1.015) translateY(-2px);
         }
       }
       ```
       And set a no-hover fallback that only changes shadow/border (no transform).
  </action>
  <verify>npm run build (success, gzip ≤ 170kB)</verify>
  <done>
    - Reduced motion block covers all animations, transforms, and transitions
    - Card/button hovers have no transforms in reduced-motion
    - Page enter animation disabled in reduced-motion
    - Skeleton shimmer stops in reduced-motion
    - Global focus-visible uses token variables
    - Hover transforms wrapped in @media (hover: hover)
  </done>
</task>

## Success Criteria
- [ ] Skip link visible on Tab, jumps to main content
- [ ] --color-text-muted contrast ≥ 4.5:1 both modes
- [ ] Reduced motion: no animations, no transforms, opacity-only transitions
- [ ] Focus-visible uses token variables globally
- [ ] Card hovers use @media (hover: hover) for touch safety
- [ ] Build succeeds, gzip ≤ 170 kB
