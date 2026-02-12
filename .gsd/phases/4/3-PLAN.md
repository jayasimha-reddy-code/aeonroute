---
phase: 4
plan: 3
wave: 2
---

# Plan 4.3: Navigation — Sidebar Keyboard Nav + ARIA Landmarks

## Objective
Add WCAG-compliant keyboard navigation to the Sidebar, ARIA landmarks across Header and Sidebar, and glass surface integration using Phase 4.1 tokens.

## Context
- .gsd/phases/4/SPEC.md (§2.3 Navigation, §4.3 Keyboard, §4.4 ARIA)
- frontend/src/components/Sidebar.tsx
- frontend/src/components/Header.tsx

## Tasks

<task type="auto">
  <name>Sidebar ARIA + keyboard navigation</name>
  <files>frontend/src/components/Sidebar.tsx</files>
  <action>
    1. Wrap the <nav> element with `role="navigation"` and `aria-label="Main navigation"`
    2. Add `aria-current="page"` to the active nav button
    3. Add `aria-expanded={!sidebarCollapsed}` to the collapse toggle button
    4. On the mobile overlay `<div>`, add `aria-modal="true"` and `role="dialog"`
    5. Add `onKeyDown` handler to the `<nav>` element implementing:
       - ArrowDown: focus next nav button (wrap at end → first)
       - ArrowUp: focus previous nav button (wrap at start → last)
       - Home: focus first nav button
       - End: focus last nav button
       - Enter/Space: activate (click) focused button
    6. Implementation approach: use `useRef` to store refs to each button, manage focusedIndex with useState, call `.focus()` on key press.
    7. Add `tabIndex={0}` to the first nav button, `tabIndex={-1}` to the rest (roving tabindex pattern)
    8. Mobile overlay: add `onKeyDown` handler for Escape → close sidebar
    9. Update sidebar width transition to use `var(--spring-smooth)` timing function
    
    Do NOT change any visual styles, colors, or layout behavior.
  </action>
  <verify>npx tsc --noEmit (0 errors)</verify>
  <done>
    - nav has role="navigation" and aria-label
    - Active item has aria-current="page"
    - Collapse toggle has aria-expanded
    - ArrowUp/ArrowDown/Home/End/Enter/Space work
    - Roving tabindex pattern implemented
    - Mobile overlay has aria-modal and Escape closes it
  </done>
</task>

<task type="auto">
  <name>Header ARIA + semantic improvements</name>
  <files>frontend/src/components/Header.tsx</files>
  <action>
    1. The <header> element already uses semantic HTML — verify `role="banner"` is implicit (no change needed if using <header>)
    2. Add `aria-label="Open navigation"` to the mobile menu button (verify existing)
    3. Add `aria-label="Notifications"` to the notification button (verify existing)
    4. Ensure Header uses `var(--glass-bg)` token:
       - Replace `glass` class on the header with inline computed styles OR update the `.glass` class in index.css to use `var(--glass-bg)` token
       - RECOMMENDED: Update the `.glass` class definition in index.css to use the new tokens:
         ```css
         .glass {
           background: var(--glass-bg);
           backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
           border: 1px solid var(--glass-border);
         }
         ```
       - This automatically upgrades ALL components using `.glass`
    5. Update `.glass-subtle` similarly to use token variables
    
    The dark .glass and .dark .glass-subtle blocks should be removed since the tokens handle light/dark automatically.
  </action>
  <verify>npx tsc --noEmit (0 errors) && npm run build (success)</verify>
  <done>
    - Header aria-labels verified on all buttons
    - `.glass` class uses --glass-bg, --glass-blur, --glass-saturate, --glass-border tokens
    - `.glass-subtle` upgraded similarly
    - Dark mode variants removed (tokens handle it)
    - All existing .glass consumers automatically upgraded
  </done>
</task>

## Success Criteria
- [ ] Sidebar keyboard navigation works (Arrow keys, Home, End, Enter, Space)
- [ ] All ARIA attributes present (navigation, aria-current, aria-expanded, aria-modal)
- [ ] Escape closes mobile sidebar overlay
- [ ] .glass and .glass-subtle use token variables
- [ ] TypeScript compiles with 0 errors
- [ ] Build succeeds
