---
phase: 4
plan: 1
wave: 1
---

# Plan 4.1: Design Tokens — Glass, Motion, Typography, Spacing

## Objective
Add all new CSS custom properties and Tailwind theme extensions required by the Phase 4 SPEC. This plan touches ONLY token definitions — no component refactors. All subsequent plans depend on these tokens existing.

## Context
- .gsd/phases/4/SPEC.md (§1 Design System Definition)
- frontend/src/index.css (:root, .dark, @layer base)
- frontend/tailwind.config.ts (theme.extend)

## Tasks

<task type="auto">
  <name>Add glass + glow + focus CSS custom properties</name>
  <files>frontend/src/index.css</files>
  <action>
    In the `:root` block (lines 13-59), append the following tokens AFTER line 58 (before closing `}`):
    
    ```css
    /* Glass surface tokens */
    --glass-bg: rgba(255, 255, 255, 0.72);
    --glass-border: rgba(226, 232, 240, 0.6);
    --glass-blur: 16px;
    --glass-saturate: 180%;
    --surface-overlay: rgba(248, 250, 252, 0.8);
    
    /* Focus + glow tokens */
    --focus-ring: rgba(20, 168, 192, 0.4);
    --focus-ring-offset: 2px;
    --glow-primary: rgba(20, 168, 192, 0.15);
    --glow-accent: rgba(245, 158, 11, 0.12);
    
    /* Spring easing tokens */
    --spring-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
    --spring-smooth: cubic-bezier(0.16, 1, 0.3, 1);
    --spring-snappy: cubic-bezier(0.22, 1, 0.36, 1);
    
    /* Typography scale */
    --text-display: 2rem;
    --text-heading: 1.25rem;
    --text-subheading: 0.875rem;
    --text-body: 0.875rem;
    --text-caption: 0.75rem;
    --text-micro: 0.625rem;
    
    /* Spacing tokens */
    --space-page: 24px;
    --space-section: 24px;
    --space-card: 20px;
    --space-inline: 8px;
    --space-stack: 12px;
    ```
    
    In the `.dark` block (lines 65-78), append AFTER line 77 (before closing `}`):
    
    ```css
    /* Glass surface tokens — dark */
    --glass-bg: rgba(15, 23, 42, 0.65);
    --glass-border: rgba(148, 163, 184, 0.08);
    --glass-blur: 20px;
    --glass-saturate: 160%;
    --surface-overlay: rgba(11, 17, 32, 0.85);
    
    /* Focus + glow — brighter in dark */
    --focus-ring: rgba(46, 201, 221, 0.45);
    --glow-primary: rgba(46, 201, 221, 0.2);
    --glow-accent: rgba(251, 191, 36, 0.15);
    ```
    
    Do NOT modify any existing tokens. Only append new ones.
  </action>
  <verify>npx tsc --noEmit (0 errors) && npm run build (success, gzip ≤ 170kB)</verify>
  <done>
    - `:root` block contains all 17 new token declarations
    - `.dark` block contains all 10 dark-mode overrides
    - No existing token values changed
    - Build succeeds
  </done>
</task>

<task type="auto">
  <name>Add surface elevation utility classes</name>
  <files>frontend/src/index.css</files>
  <action>
    In the `@layer components` block, AFTER the existing `.card-glow` section (after line 263), add a new section:
    
    ```css
    /* Surface elevation tiers */
    .surface-base {
      background: var(--color-bg);
    }
    
    .surface-raised {
      background: var(--glass-bg);
      backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
      -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
      border: 1px solid var(--glass-border);
      box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05);
      transition: background-color 200ms, border-color 150ms, box-shadow 200ms;
    }
    
    .surface-float {
      background: white;
      backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
      -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
      border: 1px solid var(--glass-border);
      box-shadow: 0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08);
      transition: background-color 200ms, border-color 150ms, box-shadow 200ms;
    }
    
    .dark .surface-float {
      background: rgba(30, 41, 59, 0.6);
    }
    
    .surface-overlay {
      background: white;
      backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
      -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
      border: 1px solid var(--glass-border);
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    }
    
    .dark .surface-overlay {
      background: rgba(30, 41, 59, 0.9);
    }
    ```
    
    Do NOT touch existing `.glass` or `.card` classes — those are consumed in Wave 2.
  </action>
  <verify>npm run build (success)</verify>
  <done>
    - `.surface-base`, `.surface-raised`, `.surface-float`, `.surface-overlay` classes exist
    - Each tier uses --glass-* tokens for consistency
    - Dark mode overrides for .surface-float and .surface-overlay present
  </done>
</task>

<task type="auto">
  <name>Add responsive spacing overrides</name>
  <files>frontend/src/index.css</files>
  <action>
    Add a media query at the end of the `:root` / base area (after the .dark block, before @layer base):
    
    ```css
    @media (max-width: 639px) {
      :root {
        --space-page: 16px;
        --space-card: 16px;
      }
    }
    ```
  </action>
  <verify>npm run build (success)</verify>
  <done>
    - Mobile spacing overrides exist in a max-width:639px media query
    - --space-page and --space-card shrink to 16px on small screens
  </done>
</task>

## Success Criteria
- [ ] 17 new tokens in `:root`, 10 in `.dark`
- [ ] 4 surface elevation utility classes defined
- [ ] Responsive spacing overrides for mobile
- [ ] Build succeeds, gzip ≤ 170 kB
- [ ] No existing token values changed
