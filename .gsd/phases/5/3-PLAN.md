---
phase: 5
plan: 3
wave: 2
---

# Plan 5.3: E2E User Flow Tests (Playwright)

## Objective
Add end-to-end tests using Playwright that verify core user flows: page load, navigation, route generation, and theme switching.

## Context
- frontend/ (Vite React app on localhost:5173)
- backend_api.py (FastAPI on localhost:8000)
- frontend/src/App.tsx — main app with tab navigation
- frontend/src/components/Sidebar.tsx — navigation component

## Tasks

<task type="auto">
  <name>Install Playwright + create E2E test infrastructure</name>
  <files>frontend/package.json, frontend/playwright.config.ts, frontend/e2e/</files>
  <action>
    1. Install Playwright:
       ```bash
       cd frontend
       npm install -D @playwright/test
       npx playwright install chromium
       ```
    2. Create `frontend/playwright.config.ts`:
       ```ts
       import { defineConfig } from '@playwright/test';
       
       export default defineConfig({
         testDir: './e2e',
         timeout: 30000,
         retries: 1,
         use: {
           baseURL: 'http://localhost:5173',
           headless: true,
           screenshot: 'only-on-failure',
         },
         webServer: {
           command: 'npm run dev',
           port: 5173,
           reuseExistingServer: true,
         },
       });
       ```
    3. Add to `frontend/package.json` scripts:
       ```json
       "test:e2e": "playwright test"
       ```
    4. Create `frontend/e2e/` directory
  </action>
  <verify>npx playwright test --list (shows test files, 0 errors)</verify>
  <done>
    - Playwright installed with Chromium
    - Config file created with dev server integration
    - e2e/ directory ready
    - playwright test --list runs without errors
  </done>
</task>

<task type="auto">
  <name>Write core E2E user flow tests</name>
  <files>frontend/e2e/app.spec.ts, frontend/e2e/navigation.spec.ts</files>
  <action>
    **e2e/app.spec.ts:**
    1. Test: page loads with title "EVRouteOpt"
    2. Test: dashboard view is default
    3. Test: skip link appears on Tab press and links to #main-content
    4. Test: theme toggle cycles through Light → Dark → System

    **e2e/navigation.spec.ts:**
    1. Test: clicking sidebar items changes active view
    2. Test: Route Planner tab shows route planner content
    3. Test: Training tab shows training content
    4. Test: Analytics tab shows analytics content
    
    **Guidelines:**
    - Use `page.goto('/')` (baseURL from config)
    - Use accessible locators: `page.getByRole()`, `page.getByText()`, `page.getByLabel()`
    - Tests should work WITHOUT backend running (frontend renders empty states)
    - Keep tests fast: no waiting for API responses unless testing route generation
    - Add `test.describe` blocks for grouping
  </action>
  <verify>npx playwright test (all pass, 0 failures)</verify>
  <done>
    - 2 E2E test files with ~8 tests
    - All tests pass in headless Chromium
    - Tests verify page load, navigation, theme, skip link
    - No dependency on backend being running
  </done>
</task>

## Success Criteria
- [ ] Playwright installed and configured
- [ ] Page load test passes
- [ ] Navigation between all 4 tabs works
- [ ] Theme toggle cycles correctly
- [ ] Skip link test passes
- [ ] All E2E tests pass: npx playwright test
