---
phase: 5
plan: 4-gap
wave: 1
gap_closure: true
---

# Fix Plan: CI Pipeline Missing Frontend Tests

## Problem
The `.github/workflows/tests.yml` CI pipeline only runs Python backend tests (pytest, flake8, black). It does not run frontend tests (TypeScript linting, Vitest, or build verification), which is a Phase 5 ROADMAP deliverable.

**Evidence:**
```bash
> findstr "frontend" .github\workflows\tests.yml
No results found
```

## Tasks

<task type="auto">
  <name>Add frontend test job to CI pipeline</name>
  <files>.github/workflows/tests.yml</files>
  <action>
Add a new job called `frontend-tests` that:
1. Sets up Node.js 18+
2. Installs dependencies with `npm ci` in frontend/ directory
3. Runs TypeScript type checking: `npx tsc --noEmit`
4. Runs Vitest: `npm run test -- --run`
5. Runs production build: `npm run build`
6. Checks build size (< 170 kB gzipped)

The job should run on ubuntu-latest and execute in parallel with the Python tests.
  </action>
  <verify>
```bash
# Verify frontend job exists in CI config
findstr /i "frontend" .github\workflows\tests.yml

# (Optional) Simulate CI run locally
cd frontend
npm ci
npx tsc --noEmit
npm run test -- --run
npm run build
```
  </verify>
  <done>
- `.github/workflows/tests.yml` contains `frontend-tests` job
- Job runs: setup-node → npm ci → tsc → vitest → build
- Job configured to run on every push/PR
  </done>
</task>

## Success Criteria
- CI pipeline includes frontend test job
- Verification command `findstr frontend .github\workflows\tests.yml` returns matches
- Must-have #7 from verification report satisfied
