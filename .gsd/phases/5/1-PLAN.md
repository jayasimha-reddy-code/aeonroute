---
phase: 5
plan: 1
wave: 1
---

# Plan 5.1: Frontend Component Rendering Tests (React Testing Library)

## Objective
Add rendering tests for the core frontend components using React Testing Library + Vitest. Verify that components render correctly, display expected content, and respond to user interactions.

## Context
- frontend/src/components/Header.tsx
- frontend/src/components/Sidebar.tsx
- frontend/src/components/ToastContainer.tsx
- frontend/src/components/StatCard.tsx
- frontend/src/__tests__/store.test.ts (existing — 13 tests)
- frontend/vite.config.ts (vitest config)

## Tasks

<task type="auto">
  <name>Install testing dependencies + configure jsdom</name>
  <files>frontend/package.json, frontend/vite.config.ts</files>
  <action>
    1. Install testing deps:
       ```bash
       cd frontend
       npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
       ```
    2. Update `vite.config.ts` to add vitest config:
       - Add `test.environment: 'jsdom'`
       - Add `test.globals: true`
       - Add `test.setupFiles: ['./src/__tests__/setup.ts']`
    3. Create `frontend/src/__tests__/setup.ts`:
       ```ts
       import '@testing-library/jest-dom/vitest';
       ```
    4. Verify: `npx vitest run` — existing 13 store tests still pass
  </action>
  <verify>npx vitest run (13 tests pass, 0 failures)</verify>
  <done>
    - RTL + jest-dom installed
    - jsdom environment configured
    - Setup file imports matchers
    - Existing tests still pass
  </done>
</task>

<task type="auto">
  <name>Write component rendering tests for Header, Sidebar, StatCard</name>
  <files>
    frontend/src/__tests__/Header.test.tsx,
    frontend/src/__tests__/Sidebar.test.tsx,
    frontend/src/__tests__/StatCard.test.tsx
  </files>
  <action>
    **Header.test.tsx:**
    1. Test: renders app title "EVRouteOpt"
    2. Test: renders theme toggle button with aria-label
    3. Test: renders mobile menu button on small screens
    
    **Sidebar.test.tsx:**
    1. Test: renders navigation with role="navigation"
    2. Test: renders all 4 menu items (Dashboard, Route Planner, Training, Analytics)
    3. Test: active item has aria-current="page"
    4. Test: keyboard navigation (Arrow keys move focus)
    
    **StatCard.test.tsx:**
    1. Test: renders title and value props
    2. Test: renders with trend indicator (up/down)
    3. Test: renders icon when provided
    
    **Guidelines:**
    - Mock Zustand store using `useSystemStore.setState()`
    - Wrap renders in act() when needed
    - Use `screen.getByRole`, `screen.getByText`, `screen.getByLabelText` for queries
    - Don't test implementation details — test what the user sees
  </action>
  <verify>npx vitest run (all tests pass, 0 failures)</verify>
  <done>
    - 3 new test files created
    - ~10 new tests covering core component rendering
    - All tests pass with 0 failures
    - No regression in existing 13 store tests
  </done>
</task>

## Success Criteria
- [ ] RTL + jsdom + jest-dom configured and working
- [ ] Header renders with title and theme toggle
- [ ] Sidebar renders with nav landmark and menu items
- [ ] StatCard renders with title, value, and trend
- [ ] All tests pass: npx vitest run
