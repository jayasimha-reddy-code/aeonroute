---
phase: 5
plan: 4
wave: 3
---

# Plan 5.4: CI Pipeline Update — Frontend Tests + Build Verification

## Objective
Update the existing GitHub Actions CI pipeline to include frontend tests (Vitest + build) alongside the existing Python tests. Ensure the pipeline validates both frontend and backend on every push and PR.

## Context
- .github/workflows/tests.yml — Existing CI (Python only: flake8, black, pytest)
- frontend/package.json — Frontend build/test scripts
- frontend/vite.config.ts — Vitest config

## Tasks

<task type="auto">
  <name>Add frontend job to CI pipeline</name>
  <files>.github/workflows/tests.yml</files>
  <action>
    MODIFY `.github/workflows/tests.yml`:
    
    1. ADD a new `frontend` job after existing `test` job:
       ```yaml
       frontend:
         runs-on: ubuntu-latest
         
         steps:
         - name: Checkout code
           uses: actions/checkout@v4
         
         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '20'
             cache: 'npm'
             cache-dependency-path: frontend/package-lock.json
         
         - name: Install dependencies
           working-directory: frontend
           run: npm ci
         
         - name: TypeScript check
           working-directory: frontend
           run: npx tsc --noEmit
         
         - name: Unit tests
           working-directory: frontend
           run: npx vitest run
         
         - name: Build
           working-directory: frontend
           run: npm run build
       ```
    
    2. UPDATE `lint-summary` job to `needs: [test, frontend]`
    
    3. UPDATE trigger branches: add `master` alongside `main` and `develop`
    
    **DO NOT:**
    - Include E2E tests in CI (they require both frontend and backend running)
    - Remove or modify the existing Python test job
    - Change the Docker build job
  </action>
  <verify>
    - Validate YAML syntax: check file parses correctly
    - Verify job names and dependencies are correct
    - Existing Python test job is unchanged
  </verify>
  <done>
    - CI pipeline has `test` (Python) + `frontend` (Node.js) jobs
    - Frontend job: tsc check → vitest → build
    - lint-summary depends on both jobs
    - YAML is valid and parseable
  </done>
</task>

<task type="auto">
  <name>Add test scripts to package.json and verify full suite</name>
  <files>frontend/package.json</files>
  <action>
    1. Add/update scripts in `frontend/package.json`:
       ```json
       "test": "vitest run",
       "test:watch": "vitest",
       "test:coverage": "vitest run --coverage"
       ```
    
    2. Run full verification:
       - `npm test` — all unit tests pass
       - `npx tsc --noEmit` — 0 errors
       - `npm run build` — succeeds, gzip ≤ 170 kB
    
    3. Run backend tests:
       - `pytest src -v --cov=src --cov-report=term-missing`
  </action>
  <verify>
    npm test (all pass) && npx tsc --noEmit (0 errors) && npm run build (success)
    pytest src -v (all pass)
  </verify>
  <done>
    - package.json has test, test:watch, test:coverage scripts
    - All frontend tests pass
    - All backend tests pass
    - Build verified
  </done>
</task>

## Success Criteria
- [ ] CI YAML has frontend job with TypeScript + Vitest + Build steps
- [ ] lint-summary depends on both test and frontend jobs
- [ ] YAML is valid
- [ ] `npm test` runs all frontend tests successfully
- [ ] Backend pytest suite still passes
- [ ] Build still ≤ 170 kB gzip
