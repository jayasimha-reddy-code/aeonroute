# Research: Phase 03 — Design System & UI Polish

## Summary

Phase 03 transforms the EV Routing frontend from a functional prototype into a glassmorphism-styled, animation-rich application. The existing codebase is **remarkably well-prepared**: glass CSS tokens (`--glass-bg`, `--glass-border`, `--glass-blur`, `--glass-saturate`) are already defined for both light and dark modes in `index.css`, a `.glass` CSS class exists, the `.card` class already uses `backdrop-filter: blur()`, motion design tokens (`--motion-*`, `--spring-*`) are in place, and `Skeleton.tsx` with shimmer animations is already used across pages.

**Key delta to close:**
1. Install **Framer Motion** (the only new dependency)
2. Refactor existing CSS-class glass into **React components** (`GlassCard`, `GlassButton`, `GlassInput`)
3. Replace CSS `animate-page-enter` with Framer Motion **AnimatePresence** for exit animations
4. Add **animated number counter** to `StatCard`
5. Smooth **theme crossfade** transition (CSS `transition` on `:root` — already partially there)
6. Standardize **skeleton loading** pattern across all pages
7. Add **presentation mode** toggle (CSS class + keyboard shortcut)
8. Responsive tweaks for **projector display** (19201080 / 1280720)

The effort is primarily wiring up what exists — the design tokens are the hardest part, and they're done.

---

## Standard Stack

| Library | Version | Purpose | Bundle Impact |
|---------|---------|---------|---------------|
| `framer-motion` | `^11.15.0` | Page transitions, staggered animations, spring physics, animated counters | ~33KB gzipped (tree-shakes well — only used APIs are bundled) |
| `react` | `18.2.0` (existing) | — | — |
| `tailwindcss` | `3.3.6` (existing) | Design tokens, utility classes | — |
| `zustand` | `4.4.1` (existing) | Theme state, presentation mode state | — |
| `clsx` | `2.0.0` (existing) | Class merging | — |

**No other new dependencies needed.** Framer Motion 11+ is the single addition.

### Framer Motion 11 — Key Facts
- Dropped `motion.div` default — now uses `m` as lightweight alias with `LazyMotion` for tree-shaking
- `AnimatePresence` supports `mode="wait"` (replaces `exitBeforeEnter`)
- `useSpring`, `useMotionValue`, `useTransform` are all in the main bundle
- Works natively with React 18 concurrent features
- TypeScript types are built-in (no `@types/` needed)
- Vite handles ESM imports — no special config

### Install Command
```bash
cd frontend && npm install framer-motion@^11.15.0
```

### Vite Config Update
Add `framer-motion` as a manual chunk for code-splitting:
```ts
manualChunks: {
  'vendor-react': ['react', 'react-dom'],
  'vendor-motion': ['framer-motion'],  // NEW
  'vendor-map': ['leaflet', 'react-leaflet'],
  'vendor-charts': ['recharts'],
  'vendor-state': ['zustand', 'axios'],
}
```

---

## Architecture Patterns

### Design System File Structure

```
frontend/src/
 components/
    ui/
        GlassCard.tsx         NEW: glassmorphism card (wraps tokens)
        GlassButton.tsx       NEW: glassmorphism button
        GlassInput.tsx        NEW: glassmorphism input
        AnimatedNumber.tsx    NEW: rolling counter component
        PageTransition.tsx    NEW: AnimatePresence wrapper
        Card.tsx              EXISTING: keep as-is (non-glass variant)
        Button.tsx            EXISTING: keep as-is
        Input.tsx             EXISTING: keep as-is
        Skeleton.tsx          EXISTING: extend with page-level skeletons
        index.ts              UPDATE: export new components
        ...
 hooks/
    useApi.ts                EXISTING
    useAnimatedNumber.ts     NEW: hook for counting animation
    usePresentationMode.ts   NEW: Ctrl+Shift+P toggle
    useReducedMotion.ts      NEW: respects prefers-reduced-motion
 lib/
    utils.ts                 EXISTING
    motion.ts                NEW: shared Framer Motion variants/presets
 store/
    store.ts                 UPDATE: add presentationMode slice
 index.css                    UPDATE: add presentation mode CSS, glass tweaks
```

### Component Hierarchy — Glass System

The key architectural decision: **keep both glass and non-glass card variants**. The existing `Card.tsx` has 5 variants for non-glassmorphism surfaces. The new `GlassCard` is specifically for the frosted-glass aesthetic.

```
GlassCard (new)
   Uses CSS variables: --glass-bg, --glass-border, --glass-blur, --glass-saturate
   Has backdrop-filter: blur() + saturate()
   Variants: default, elevated, interactive, glow
   Renders noise texture via pseudo-element (optional)

Card (existing, keep)
   5 variants: default, bordered, elevated, glow, interactive
   Some already use surface colors
   Use for non-glass surfaces (settings panels, form containers)
```

### Motion Architecture — Centralized Variants

Create `src/lib/motion.ts` as a single source of truth for all animation variants:

```ts
// src/lib/motion.ts
export const pageVariants = {
  initial: { opacity: 0, y: 12, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit:    { opacity: 0, y: -8, filter: 'blur(4px)' },
};

export const pageTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

export const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};
```

This replaces the CSS-only `animate-stagger` class with proper spring-physics animations that support exit animations.

---

## Don't Hand-Roll

| Feature | Use This | Not This |
|---------|----------|----------|
| Page transitions | Framer Motion `AnimatePresence` | CSS animation + key prop (current) |
| Staggered entrance | Framer Motion `staggerChildren` | CSS `.animate-stagger` nth-child delays |
| Number counter | Framer Motion `useSpring` + `useMotionValue` | `requestAnimationFrame` loop or library |
| Spring physics | Framer Motion `type: "spring"` | CSS `cubic-bezier` approximation |
| Class merging | `clsx` (existing) | String concatenation |
| Theme persistence | Zustand `persist` (existing) | `localStorage` directly |
| Skeleton shimmer | Existing `.skeleton-shimmer` CSS class | Third-party skeleton library |
| Glass blur | CSS `backdrop-filter` + tokens (existing) | Canvas blur or SVG filter |

---

## Common Pitfalls

### 1. backdrop-filter Browser Support
- `backdrop-filter` is supported in all modern browsers but **degrades silently** in older Firefox (<103)
- Always include `-webkit-backdrop-filter` alongside `backdrop-filter` (already done in `index.css`)
- **Pitfall:** On some Linux distros with older GPU drivers, `backdrop-filter` causes paint jank. The fix: add `will-change: backdrop-filter` or `transform: translateZ(0)` to force GPU compositing

### 2. AnimatePresence with Non-Route Navigation
- The app uses `activeTab` from zustand + switch statement, NOT react-router
- **Pitfall:** `AnimatePresence` needs a **keyed child** to detect enter/exit. The current `key={activeTab}` on the wrapping div is correct in principle but the CSS animation must be replaced with Framer Motion's `motion.div`
- **Pattern:** Wrap the switch statement output in `<AnimatePresence mode="wait">` with `<motion.div key={activeTab}>` 
- `mode="wait"` ensures the exit animation completes before the enter animation starts

### 3. Theme Flash (FOUC)
- **Current state:** `body` already has `transition: background-color var(--duration-slow)` which provides a smooth background crossfade
- **Pitfall:** The `dark` class is toggled on `document.documentElement` which persists across page loads via zustand persist — BUT on first load, there's a brief window before JS hydrates where the class may not be set
- **Fix:** Add a blocking `<script>` in `index.html` `<head>` that reads localStorage and sets the class BEFORE React renders:
  ```html
  <script>
    try {
      const prefs = JSON.parse(localStorage.getItem('ev-routing-preferences') || '{}');
      const mode = prefs?.state?.themeMode;
      const dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
      if (dark) document.documentElement.classList.add('dark');
    } catch {}
  </script>
  ```
- **Pitfall:** Transition on `*` selector catches ALL color changes — can cause laggy theme toggle on complex pages. Scope transitions to `body`, `.card`, `.glass`, specific surfaces

### 4. Framer Motion Bundle Size
- Full import `import { motion } from 'framer-motion'` pulls ~33KB gzipped
- Using `LazyMotion` + `domAnimation` feature set reduces initial load to ~18KB
- **Recommendation:** Use `LazyMotion` at App level for optimal code-splitting:
  ```tsx
  import { LazyMotion, domAnimation } from 'framer-motion';
  // Wrap app:
  <LazyMotion features={domAnimation}>...</LazyMotion>
  ```
  Then use `m.div` instead of `motion.div` inside `LazyMotion` children

### 5. Animated Numbers — NaN and Formatting
- `useSpring` outputs raw floats. If `StatCard` receives `"—"` or `"N/A"` values, the counter must gracefully fallback to static display
- Numbers like `"42.5 kWh"` need parsing: extract numeric part, animate it, re-append unit
- **Pattern:** `AnimatedNumber` component should accept `value: number`, `prefix?: string`, `suffix?: string`, `decimals?: number`

### 6. Skeleton-to-Content Flash
- When data loads fast (<100ms), skeleton  content causes a distracting flash
- **Fix:** Add a minimum display time (200ms) for skeletons, or use `startTransition` to batch updates
- The existing pattern of `loading ? <Skeleton> : <Content>` works but consider `Suspense` boundaries for lazy-loaded page components (already in App.tsx)

### 7. prefers-reduced-motion
- The codebase already has a comprehensive `@media (prefers-reduced-motion: reduce)` block in `index.css`
- Framer Motion **does NOT** automatically respect this
- **Fix:** Create a `useReducedMotion` hook (Framer has `useReducedMotion()` built-in) and conditionally disable spring animations:
  ```tsx
  const shouldReduce = useReducedMotion();
  const transition = shouldReduce ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 };
  ```

### 8. Performance — Too Many Animated Elements
- Glass blur + Framer animations on 20+ cards simultaneously can drop frames
- **Fix:** Use `will-change: transform` only during animation (Framer handles this), avoid `will-change: backdrop-filter` on more than 5 visible elements at once
- For the dashboard grid (4 stat cards + 3+ info cards), stagger entrance so only 1-2 animate at a time

---

## Implementation Notes

### UI-01: Glassmorphism Design Tokens

**Current State:** Already 90% done. The tokens exist in `index.css`:
```css
:root {
  --glass-bg: rgba(255, 255, 255, 0.72);
  --glass-border: rgba(226, 232, 240, 0.6);
  --glass-blur: 16px;
  --glass-saturate: 180%;
}
.dark {
  --glass-bg: rgba(15, 23, 42, 0.65);
  --glass-border: rgba(148, 163, 184, 0.08);
  --glass-blur: 20px;
  --glass-saturate: 160%;
}
```

**What's needed:**
1. Add Tailwind utility classes that map to these tokens. Two approaches:
   - **Option A (recommended):** Extend `tailwind.config.ts` with custom utilities via plugin:
     ```ts
     plugins: [
       function({ addUtilities }) {
         addUtilities({
           '.glass-bg': { background: 'var(--glass-bg)' },
           '.glass-border': { 'border-color': 'var(--glass-border)' },
           '.glass-blur': { 
             'backdrop-filter': 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
             '-webkit-backdrop-filter': 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
           },
         })
       }
     ]
     ```
   - **Option B:** Keep using the existing `.glass` CSS class in `index.css` component layer (already works)

2. **Noise texture overlay** (optional polish): A subtle SVG noise overlay adds realism to glass surfaces. Implemented via a pseudo-element with a base64 SVG noise pattern:
   ```css
   .glass-noise::before {
     content: '';
     position: absolute;
     inset: 0;
     background: url("data:image/svg+xml,...") repeat;
     opacity: 0.03;
     pointer-events: none;
     border-radius: inherit;
   }
   ```
   This is subtle but adds depth that evaluators will notice subconsciously.

3. Add elevation-aware glass variants:
   - `--glass-bg-elevated: rgba(255, 255, 255, 0.82)` (more opaque = higher elevation)
   - `--glass-bg-sunken: rgba(255, 255, 255, 0.55)` (more transparent = lower)

**Recommendation:** Option B (keep `.glass` CSS class) is simplest since it already exists and works. Extend it with noise texture. Add Tailwind plugin only if granular composition is needed per-component.

---

### UI-02: Glass Components

**What to build:**

#### GlassCard.tsx
```tsx
interface GlassCardProps {
  variant?: 'default' | 'elevated' | 'interactive' | 'glow';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}
```
- Core: uses `.glass` class + custom variant modifiers
- `elevated`: increased `--glass-bg` opacity + stronger shadow
- `interactive`: hover transform + glow border (like existing `.card-interactive`)
- `glow`: primary-color glow on hover (like existing `.card-glow`)
- Should render a `<motion.div>` (from Framer) to enable entrance/exit animations natively
- **Keep existing `Card.tsx` unchanged** — `GlassCard` is additive

#### GlassButton.tsx
- Extends the glass aesthetic to buttons
- Use `backdrop-filter: blur()` on the button surface
- Light mode: semi-transparent white bg with blur
- Dark mode: semi-transparent dark bg with blur
- Hover: slightly increase opacity + subtle glow
- **Not a replacement** for `.btn-primary` etc. — this is a variant for in-glass-surface buttons

#### GlassInput.tsx
- Input field with glass background
- Frosted appearance with blur behind
- Focus state: glass border brightens + subtle glow ring
- Maps to existing `--glass-*` tokens

**Implementation pattern:** Each glass component should:
1. Accept a `className` prop for composition
2. Use `cn()` for class merging
3. Use CSS custom properties (not hardcoded values) for theme awareness
4. Forward refs for DOM access
5. Include `role` and `aria-*` for accessibility

---

### UI-03: Theme Toggle (Light/Dark with Smooth Transition)

**Current State:**
- Toggle works via `cycleTheme()` in zustand (light  dark  system  light)
- Header shows animated icon rotation (Sun/Moon/Monitor) with `transition-all duration-300`
- `document.documentElement.classList.toggle('dark', isDarkMode)` in App.tsx useEffect
- `body` has `transition: background-color var(--duration-slow)` CSS rule  

**What's needed for "smooth crossfade — no FOUC":**

1. **Blocking script in index.html** (described in pitfalls) — prevents flash on first load

2. **CSS `transition` on all surface elements:**
   The `body` transition is already in place. Add transitions to the elements that visually change:
   ```css
   .card, .glass, .surface-raised, .surface-float,
   .btn-secondary, .input-field, .badge {
     transition: background-color var(--duration-slow) var(--ease-out-expo),
                 border-color var(--duration-normal) ease,
                 color var(--duration-normal) ease,
                 box-shadow var(--duration-normal) ease;
   }
   ```
   **Already partially there** — the `.card` class has `transition: transform, box-shadow, border-color`. Just add `background-color` and `color`.

3. **Whole-page crossfade (optional, premium feel):**
   Use a brief opacity dip during transition:
   ```ts
   // In cycleTheme handler:
   document.documentElement.style.transition = 'opacity 150ms';
   document.documentElement.style.opacity = '0.97';
   // Toggle class...
   requestAnimationFrame(() => {
     document.documentElement.style.opacity = '1';
   });
   ```
   This creates a subtle "breathing" effect during theme switch. Very polished.

4. **Theme icon animation refinement:**
   Current icon animation is `rotate-0 scale-100 opacity-100`  `rotate-90 scale-0 opacity-0` via CSS transitions. Already smooth. Could optionally use Framer Motion `AnimatePresence` for the icon rotation but CSS approach is fine.

**Verdict:** Mostly done. Add blocking script + widen transition scope on surface elements.

---

### UI-04: Page Transitions (Framer Motion AnimatePresence)

**Current State:**
- Tab navigation via `activeTab` zustand state (not react-router)
- Pages rendered via switch statement in `App.tsx`
- Current transition: `<div className="animate-page-enter" key={activeTab}>` — CSS-only enter animation, **no exit animation**
- `animate-page-enter` = `pageEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1)` (fade-in + translateY)

**What's needed:**

Replace the CSS animation wrapper with Framer Motion:

```tsx
// App.tsx — updated renderView area
import { AnimatePresence, motion } from 'framer-motion';
import { pageVariants, pageTransition } from './lib/motion';

// Inside return:
<Suspense fallback={<PageLoader />}>
  <AnimatePresence mode="wait">
    <motion.div
      key={activeTab}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      {renderView()}
    </motion.div>
  </AnimatePresence>
</Suspense>
```

**Critical details:**
- `mode="wait"` ensures old page exits before new page enters (prevents overlap)
- `key={activeTab}` triggers AnimatePresence to detect the child has changed
- Spring transition: `{ type: 'spring', stiffness: 300, damping: 30 }` — feels snappy, not bouncy
- Include `filter: 'blur(4px)'` in initial/exit for the "glassmorphism blur" transition effect
- `<Suspense>` must wrap OUTSIDE `<AnimatePresence>` — Suspense boundaries don't work inside AnimatePresence  
- **Respect reduced motion:** Conditionally set `transition: { duration: 0 }` when `useReducedMotion()` returns true

**Variant definition (in `lib/motion.ts`):**
```ts
export const pageVariants = {
  initial: { opacity: 0, y: 12, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit:    { opacity: 0, y: -8, filter: 'blur(2px)', transition: { duration: 0.2 } },
};
```

---

### UI-05: Staggered Entrance Animations

**Current State:**
- CSS-based `.animate-stagger` in `index.css` — uses `nth-child` animation-delays (0, 50ms, 100ms, 150ms, 200ms, 250ms)
- `fadeInUp` keyframe: opacity 01, translateY 12px0
- Used on dashboard stat card grid and route card list

**What's needed:**

Replace CSS stagger with Framer Motion for:
1. Spring physics (CSS can't do real spring easing)
2. Exit animations (CSS stagger only does enter)
3. Dynamic child count (CSS nth-child max is 6)

**Pattern:**
```tsx
// StaggerContainer.tsx or use inline
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
};

// Usage in Dashboard:
<motion.div
  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8"
  variants={containerVariants}
  initial="hidden"
  animate="show"
>
  <motion.div variants={itemVariants}><StatCard ... /></motion.div>
  <motion.div variants={itemVariants}><StatCard ... /></motion.div>
  ...
</motion.div>
```

**Keep the CSS `.animate-stagger`** as a fallback for non-critical lists. Use Framer Motion stagger for hero sections (dashboard stat cards, route results).

---

### UI-06: Animated Number Counters

**Current State:**
- `StatCard.tsx` renders `<p className="text-2xl font-bold">{value}</p>` — static display
- Value can be `string | number` (e.g., `42`, `"42.5 kWh"`, `"— min"`)
- 4 stat cards on dashboard, 4 on analytics

**Best Approach: Framer Motion `useSpring` + `useMotionValue`**

This is the cleanest integration because we're already adding Framer Motion. No extra dependency.

```tsx
// hooks/useAnimatedNumber.ts
import { useEffect, useRef } from 'react';
import { useSpring, useMotionValue, useTransform, MotionValue } from 'framer-motion';

export function useAnimatedNumber(
  targetValue: number,
  options?: { duration?: number; decimals?: number; bounce?: number }
): MotionValue<string> {
  const { duration = 1.2, decimals = 0, bounce = 0 } = options ?? {};
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    stiffness: 100,
    damping: 30,
    mass: 1,
    ...(bounce ? { bounce } : {}),
  });
  const display = useTransform(springValue, (v) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v)
  );

  useEffect(() => {
    motionValue.set(targetValue);
  }, [targetValue, motionValue]);

  return display;
}
```

**AnimatedNumber component:**
```tsx
// components/ui/AnimatedNumber.tsx
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}
```

**Integration with StatCard:**
- Parse `value` prop: if it's a number, animate it. If it's a string with a unit (e.g., `"42.5 kWh"`), extract the numeric part and unit, animate the number, re-append the unit
- Fallback: if value is non-numeric (e.g., `"—"`), display statically
- Animation triggers on mount and when value changes
- Duration: ~1.2s with spring easing for satisfying "roll-up" feel

**Edge cases:**
- Value is `0`  still animate from 0 to 0 (instant, no visible animation)
- Value changes after initial load  re-animate smoothly
- `prefers-reduced-motion`  show final value immediately

---

### UI-07: Skeleton Loading Screens

**Current State:**
- `Skeleton.tsx` exists with `variant` (text/circular/rectangular), `lines` count, and shimmer animation
- `StatCardSkeleton` and `RouteCardSkeleton` presets exist
- Dashboard uses `StatCardSkeleton` during `loading` state
- RoutePlanner uses `RouteCardSkeleton` during loading
- Analytics uses `StatCardSkeleton`
- Training page — needs investigation (likely has loading state too)
- App.tsx uses `<Suspense fallback={<PageLoader />}>` for lazy-loaded pages

**What's needed:**

1. **Page-level skeleton screens** for each page:
   - `DashboardSkeleton` — 4 stat card skeletons + map placeholder + sidebar cards
   - `RoutePlannerSkeleton` — form skeleton + map placeholder + route list skeletons
   - `AnalyticsSkeleton` — 4 stat cards + chart placeholders
   - `TrainingSkeleton` — model status cards + controls
   
   These should match the exact layout of the real content (same grid, same heights) to prevent layout shift.

2. **Pattern for consistent usage:**
   ```tsx
   // Per-page pattern:
   function Dashboard() {
     const { data, isLoading } = useDashboardData();
     if (isLoading) return <DashboardSkeleton />;
     return <DashboardContent data={data} />;
   }
   ```
   
   OR keep the current conditional pattern per-section (stat cards load separately from map). The per-section approach is actually better because partial content appears faster.

3. **Suspense boundary for code-split pages:**
   Already implemented in `App.tsx` with `<PageLoader />`. This handles the initial chunk loading. The per-page skeletons handle data loading AFTER the component mounts.

4. **Skeleton-to-content animation:**
   When data arrives, transition from skeleton to content with a brief fade:
   ```tsx
   <AnimatePresence mode="wait">
     {loading ? (
       <motion.div key="skeleton" exit={{ opacity: 0 }}>
         <StatCardSkeleton />
       </motion.div>
     ) : (
       <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
         <StatCard ... />
       </motion.div>
     )}
   </AnimatePresence>
   ```

**Verdict:** The skeleton infrastructure is solid. Main work is creating page-level skeleton compositions and adding cross-fade transitions.

---

### UI-08: Responsive Layout (Laptop + Projector)

**Current State:**
- Tailwind breakpoints: `xs: 475px`, plus default `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`, `2xl: 1536px`
- Dashboard grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` — good
- Page padding: `p-4 sm:p-6 lg:p-8` — good
- Max width: `max-w-[1600px] mx-auto` — good
- Sidebar: `--sidebar-width: 272px`, collapses on mobile

**Key considerations for projector:**
- Typical projector resolution: 19201080 (Full HD) or 1280720
- Projector viewing distance: 3-10m  text must be larger than laptop
- Contrast and readability on projector (washed out colors common)

**What's needed:**

1. **Presentation mode** (see UI-09) handles most projector concerns via increased sizes
2. **Font size adjustments** for `>= xl` breakpoint:
   - Page titles: `text-2xl`  `xl:text-3xl`
   - Stat card values: `text-2xl`  `xl:text-3xl`
   - Body text should stay `text-sm`/`text-base` — already readable at 1080p
3. **Card grid spacing:**
   - Currently `gap-4 sm:gap-5` — add `xl:gap-6` for more breathing room on large screens
4. **Map container height:**
   - Currently `h-[420px]` — add `xl:h-[500px]` for more visual impact
5. **Sidebar auto-collapse** on exactly `1024px` width (common projector resolution after sidebar takes space)
6. **Container max-width** — `max-w-[1600px]` is good. At 1920px, it centers content with margins

**No new breakpoints needed.** The existing Tailwind breakpoints cover laptop and projector. Presentation mode (UI-09) handles the projector-specific tweaks.

---

### UI-09: Presentation Mode

**Concept:** A toggle (Ctrl+Shift+P) that optimizes the UI for projector/presentation by:
- Increasing contrast (thicker borders, more opaque surfaces)
- Enlarging key text and elements
- Simplifying animations (reducing motion complexity, not disabling)
- Optionally hiding non-essential UI (notifications badge, status pill)

**Implementation Strategy:** CSS class on `<html>` + zustand state + keyboard listener

1. **Zustand store addition:**
   ```ts
   // In store.ts:
   presentationMode: boolean;
   togglePresentationMode: () => void;
   ```
   Persist it so it survives page refreshes during a presentation.

2. **Keyboard shortcut hook:**
   ```tsx
   // hooks/usePresentationMode.ts
   useEffect(() => {
     const handler = (e: KeyboardEvent) => {
       if (e.ctrlKey && e.shiftKey && e.key === 'P') {
         e.preventDefault();
         togglePresentationMode();
       }
     };
     window.addEventListener('keydown', handler);
     return () => window.removeEventListener('keydown', handler);
   }, []);
   ```

3. **CSS overrides on `.presentation` class:**
   ```css
   .presentation {
     /* Increase contrast */
     --glass-bg: rgba(255, 255, 255, 0.88);           /* More opaque */
     --glass-border: rgba(226, 232, 240, 0.9);         /* Thicker-looking */
     --glass-blur: 12px;                                /* Slightly less blur */
     
     /* Bigger text */
     --text-display: 2.5rem;
     --text-heading: 1.5rem;
     --text-body: 1rem;
     
     /* Spacing */
     --space-page: 32px;
     --space-card: 24px;
   }
   
   .presentation.dark {
     --glass-bg: rgba(15, 23, 42, 0.85);
     --glass-border: rgba(148, 163, 184, 0.2);
   }
   
   /* Simplify animations */
   .presentation * {
     animation-duration: 0.1s !important;
     transition-duration: 100ms !important;
   }
   /* But keep Framer Motion animations — those are JS-controlled */
   
   /* Hide non-essential elements */
   .presentation .hide-in-presentation {
     display: none !important;
   }
   
   /* Thicker borders */
   .presentation .card,
   .presentation .glass {
     border-width: 2px;
   }
   
   /* Larger stat values */
   .presentation .stat-value {
     font-size: 2rem;
   }
   ```

4. **Visual indicator:** Show a subtle "Presentation Mode" badge in the header when active, so the user knows it's on.

5. **Framer Motion adjustments in presentation mode:**
   - Reduce spring stiffness (less bounce)
   - Shorter durations
   - Skip stagger delays (show all at once)
   Read `presentationMode` from store in motion variant definitions.

---

## Dependency Conflict Check

Current `package.json` dependencies are all compatible with Framer Motion 11:
- `react: ^18.2.0` —  FM 11 requires React 18+
- `typescript: ^5.2.2` —  FM 11 has built-in types
- `vite: ^5.0.0` —  native ESM, no config needed
- No conflicting animation libraries present

---

## Testing Considerations

- **Visual regression:** No Storybook in the project. Consider adding Playwright visual snapshot tests for glass card rendering (backdrop-filter visible), theme toggle transition, skeleton screens
- **Unit tests:** Existing Vitest setup with `@testing-library/react`. AnimatedNumber and useAnimatedNumber hook should be tested with mocked `requestAnimationFrame`
- **Framer Motion in tests:** Needs `window.matchMedia` mock (already in test-setup.ts likely). Also mock `IntersectionObserver` if using viewport-triggered animations
- **Accessibility:** Run `axe` checks on glass components to ensure contrast ratios are met (glass surfaces can have low contrast with text on complex backgrounds)

---

## Execution Order Recommendation

Based on dependency analysis:

1. **UI-01** (tokens) — foundation, 0 dependencies
2. **UI-02** (glass components) — depends on UI-01 tokens
3. **UI-03** (theme toggle) — independent, but benefits from glass surfaces
4. **Install Framer Motion** — needed before UI-04, UI-05, UI-06
5. **UI-07** (skeletons) — extend existing, independent of Framer
6. **UI-06** (animated counters) — needs Framer Motion
7. **UI-05** (staggered animations) — needs Framer Motion + glass components
8. **UI-04** (page transitions) — needs Framer Motion, touches App.tsx (risky)
9. **UI-08** (responsive) — polish pass, independent
10. **UI-09** (presentation mode) — final polish, depends on everything above

Plans should be structured in ~2-3 waves:
- **Wave 1:** UI-01, UI-02, UI-03, UI-07 (CSS/component work, no new dep)
- **Wave 2:** Install FM, UI-04, UI-05, UI-06 (Framer Motion integration)
- **Wave 3:** UI-08, UI-09 (polish + responsive + presentation)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `backdrop-filter` performance on low-end hardware | Medium | Medium | Use `will-change` sparingly, limit simultaneous blur layers to 5 |
| Framer Motion bundle bloat | Low | Medium | Use `LazyMotion` + `domAnimation`, add manual chunk in Vite |
| Theme transition lag on complex pages | Low | Low | Scope CSS transitions to specific selectors, avoid `* { transition }` |
| AnimatePresence conflicts with Suspense | Medium | High | Keep `<Suspense>` outside `<AnimatePresence>`, test exit animations |
| Animated numbers NaN on string values | Medium | Low | Parse carefully, fallback to static for non-numeric values |
| Reduced motion not respected | Low | High (a11y) | Use Framer's `useReducedMotion()`, already have CSS fallback |
