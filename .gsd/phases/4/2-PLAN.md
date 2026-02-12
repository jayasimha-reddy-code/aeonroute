---
phase: 4
plan: 2
wave: 1
---

# Plan 4.2: Theme System — 3-State Toggle + System Preference Detection

## Objective
Upgrade the theme system from a 2-state boolean toggle (Light/Dark) to a 3-state cycle (Light → Dark → System) with real-time OS preference detection. This changes the store shape and the Header toggle UI.

## Context
- .gsd/phases/4/SPEC.md (§6 Theme System Upgrade)
- frontend/src/store/store.ts (isDarkMode, toggleDarkMode, persist middleware)
- frontend/src/components/Header.tsx (Sun/Moon toggle)
- frontend/src/App.tsx (dark class application)

## Tasks

<task type="auto">
  <name>Upgrade store: themeMode field + cycleTheme + system detection</name>
  <files>frontend/src/store/store.ts</files>
  <action>
    1. Add `ThemeMode` type: `'light' | 'dark' | 'system'`
    2. Replace `isDarkMode: boolean` with `themeMode: ThemeMode` (default: `'system'`)
    3. Add computed getter `isDarkMode` that derives from themeMode:
       - `'light'` → false
       - `'dark'` → true
       - `'system'` → reads `window.matchMedia('(prefers-color-scheme: dark)').matches`
    4. Replace `toggleDarkMode()` with `cycleTheme()`: light → dark → system → light
    5. Add `setThemeMode(mode: ThemeMode)` for direct setting
    6. Update `partialize` in persist middleware to include `themeMode` (replace `isDarkMode`)
    7. Update ALL selector hooks that reference isDarkMode:
       - `useTheme()` must return `{ isDarkMode, themeMode, cycleTheme, setThemeMode }`
    8. Export `ThemeMode` type
    
    CRITICAL: `isDarkMode` must still be accessible as a property (not just a function) for backward compat with components that read `isDarkMode`. Implement it as a get-style property in the store using Zustand's subscribeWithSelector or compute inline.
    
    Simplest approach: keep `isDarkMode` as a regular state field that gets recomputed whenever `themeMode` changes or system preference changes. The system preference listener will be in App.tsx (next task).
  </action>
  <verify>npx tsc --noEmit (0 errors)</verify>
  <done>
    - `themeMode: ThemeMode` field exists in store
    - `isDarkMode: boolean` still exists (computed from themeMode)
    - `cycleTheme()` cycles light → dark → system → light
    - `setThemeMode(mode)` exists
    - `useTheme()` returns { isDarkMode, themeMode, cycleTheme, setThemeMode }
    - persist partializes `themeMode` instead of `isDarkMode`
    - TypeScript compiles with 0 errors
  </done>
</task>

<task type="auto">
  <name>Add system preference listener in App.tsx</name>
  <files>frontend/src/App.tsx</files>
  <action>
    1. Import `useTheme` (if not already used) and `useSystemStore` or the new theme hooks
    2. Add a `useEffect` that:
       a. Creates `const mq = window.matchMedia('(prefers-color-scheme: dark)')`
       b. Defines handler that calls store's internal update when system preference changes
       c. Adds `mq.addEventListener('change', handler)`
       d. On mount and when `themeMode === 'system'`, syncs `isDarkMode` from `mq.matches`
       e. Cleanup: `mq.removeEventListener('change', handler)`
    3. The .dark class is already applied via `isDarkMode` — no change needed there.
    
    Do NOT change any other existing logic in App.tsx.
  </action>
  <verify>npx tsc --noEmit (0 errors)</verify>
  <done>
    - System preference listener exists in useEffect
    - Listener cleans up on unmount
    - When themeMode is 'system', isDarkMode follows OS preference
    - When themeMode is 'light' or 'dark', OS preference is ignored
  </done>
</task>

<task type="auto">
  <name>Upgrade Header to 3-state theme toggle</name>
  <files>frontend/src/components/Header.tsx</files>
  <action>
    1. Import `Monitor` from lucide-react (add to existing import)
    2. Replace direct `useSystemStore` calls for theme with `useTheme()` hook
    3. Replace the Sun/Moon toggle button with a 3-icon cycle button:
       - themeMode === 'light': Show Sun icon (amber-500)
       - themeMode === 'dark': Show Moon icon (surface-400)
       - themeMode === 'system': Show Monitor icon (primary-500)
    4. onClick: call `cycleTheme()` instead of `toggleDarkMode()`
    5. Update aria-label to: `Theme: ${themeMode}. Click to switch.`
    6. Keep the existing crossfade animation pattern (rotation + scale + opacity)
    
    Do NOT modify any other Header functionality (health check, logo, notifications).
  </action>
  <verify>npx tsc --noEmit (0 errors)</verify>
  <done>
    - Header imports Monitor icon
    - Theme toggle shows 3 icons based on themeMode
    - cycleTheme() called on click
    - aria-label reflects current theme mode
    - Existing crossfade animation preserved
  </done>
</task>

## Success Criteria
- [ ] Store has ThemeMode type and themeMode field
- [ ] isDarkMode is computed from themeMode + system preference
- [ ] cycleTheme() cycles through 3 states
- [ ] Theme persists across page reload
- [ ] System preference auto-detected when mode = 'system'
- [ ] Header shows Sun/Moon/Monitor icons
- [ ] TypeScript compiles with 0 errors
