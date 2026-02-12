---
phase: 4
plan: 6
wave: 3
---

# Plan 4.6: Responsive Hardening + Background Gradient Layer

## Objective
Add responsive layout stability, touch target enforcement, background gradient mesh for visual depth, and final CSS polish.

## Context
- .gsd/phases/4/SPEC.md (§2.4 Background Layers, §5 Responsive Rules)
- frontend/src/index.css
- frontend/src/App.tsx
- frontend/src/pages/Dashboard.tsx

## Tasks

<task type="auto">
  <name>Background gradient layer + main content styling</name>
  <files>frontend/src/index.css, frontend/src/App.tsx</files>
  <action>
    **index.css — Add in @layer utilities or after @layer components:**
    ```css
    /* Background gradient mesh for depth */
    .bg-gradient-mesh::before {
      content: '';
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      background: radial-gradient(
        ellipse at 80% 20%,
        rgba(20, 168, 192, 0.06),
        transparent 60%
      );
    }
    
    .dark .bg-gradient-mesh::before {
      background: radial-gradient(
        ellipse at 80% 20%,
        rgba(7, 49, 61, 0.4),
        transparent 60%
      );
    }
    ```
    
    **App.tsx:**
    1. Add `bg-gradient-mesh relative` class to the `<main>` element
    2. Ensure the main content children sit above the gradient: add `relative z-10` to the Suspense wrapper div
    3. Add `scroll-smooth` class to the main element (removed by reduced-motion automatically)
  </action>
  <verify>npx tsc --noEmit (0 errors)</verify>
  <done>
    - Subtle radial gradient visible in top-right corner of main area
    - Gradient is different in light vs dark mode
    - Content renders above gradient (z-index correct)
    - Gradient does not intercept pointer events
  </done>
</task>

<task type="auto">
  <name>Responsive touch targets + layout stability</name>
  <files>frontend/src/index.css, frontend/src/components/Sidebar.tsx</files>
  <action>
    **index.css:**
    1. Add responsive touch target enforcement:
       ```css
       @media (max-width: 1023px) {
         /* Ensure touch targets on mobile */
         .btn, button, [role="button"], a {
           min-height: 44px;
           min-width: 44px;
         }
         
         /* Increase nav item padding for touch */
         nav button, nav a {
           padding-top: 12px;
           padding-bottom: 12px;
         }
       }
       ```
    
    2. Add smooth font loading fallback:
       ```css
       @font-face {
         font-family: 'Inter';
         font-display: swap;
         size-adjust: 100%;
       }
       ```
       Note: Only add if Inter is loaded via @font-face. If loaded via Google Fonts <link>, this rule is informational only. Check index.html.
    
    3. Add map aspect-ratio for layout stability:
       ```css
       .leaflet-container {
         aspect-ratio: 16 / 9;
       }
       
       @media (max-width: 767px) {
         .leaflet-container {
           aspect-ratio: 4 / 3;
         }
       }
       ```
    
    **Sidebar.tsx:**
    1. On mobile nav buttons, ensure `className` includes minimum padding: 
       - Mobile: `py-3` (12px) minimum
       - Verify current padding is >= 12px on `< lg` breakpoint
    
    2. Add `scroll-behavior: smooth` class to main scrollable nav area (check no-scrollbar already exists)
  </action>
  <verify>npm run build (success, gzip ≤ 170kB)</verify>
  <done>
    - Mobile: all buttons and nav items meet 44px min touch target
    - Map has aspect-ratio for layout stability
    - Mobile nav items have adequate touch padding
    - No layout shifts during viewport resize
    - Build succeeds within size budget
  </done>
</task>

<task type="checkpoint:human-verify">
  <name>Visual + responsive verification</name>
  <files>none</files>
  <action>
    User visually verifies:
    1. Glass surfaces render correctly (blur visible through translucent elements)
    2. Theme cycles through Light → Dark → System correctly
    3. Skip link appears on Tab press
    4. Cards/buttons show focus rings on keyboard navigation
    5. Mobile layout: sidebar slides in, touch targets adequate
    6. Background gradient mesh adds subtle depth
    7. Reduced motion: animations disabled when OS setting is on
  </action>
  <verify>User confirms visual quality</verify>
  <done>User approves visual quality of Phase 4 implementation</done>
</task>

## Success Criteria
- [ ] Background gradient mesh visible in main content area
- [ ] Mobile touch targets ≥ 44px
- [ ] Map has aspect-ratio for layout stability  
- [ ] No layout shifts during viewport resize
- [ ] Build succeeds, gzip ≤ 170 kB
- [ ] User approves visual quality
