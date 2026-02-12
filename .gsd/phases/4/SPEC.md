---
phase: 4
title: Full UI Design Refresh + Accessibility + Responsive Hardening
status: DRAFT — awaiting /plan 4
last_updated: 2026-02-12
---

# Phase 4 SPEC — UI Design Refresh + Accessibility + Responsive

## Scope

Full visual upgrade of every UI surface to a cohesive glassmorphic, depth-layered design with:
- Unified theme system (Light / Dark / System)
- WCAG AA accessibility compliance
- Responsive hardening across mobile ↔ desktop
- Zero regression on existing functionality (Zustand, React.memo, lazy routes)

---

## 1. Design System Definition

### 1.1 Color Tokens

Retain existing Tailwind color scales (`primary`, `accent`, `surface`, `success`, `warning`, `danger`, `info`). Add the following CSS custom properties:

#### Light Mode (`:root`)

| Token | Value | Purpose |
|-------|-------|---------|
| `--glass-bg` | `rgba(255, 255, 255, 0.72)` | Glass surface background |
| `--glass-border` | `rgba(226, 232, 240, 0.6)` | Glass border |
| `--glass-blur` | `16px` | Glass backdrop-filter blur |
| `--glass-saturate` | `180%` | Glass backdrop-filter saturate |
| `--surface-overlay` | `rgba(248, 250, 252, 0.8)` | Modal/dialog overlay |
| `--focus-ring` | `rgba(20, 168, 192, 0.4)` | Focus ring color |
| `--focus-ring-offset` | `2px` | Focus ring offset |
| `--glow-primary` | `rgba(20, 168, 192, 0.15)` | Primary color glow |
| `--glow-accent` | `rgba(245, 158, 11, 0.12)` | Accent color glow |

#### Dark Mode (`.dark`)

| Token | Value | Purpose |
|-------|-------|---------|
| `--glass-bg` | `rgba(15, 23, 42, 0.65)` | Glass surface background |
| `--glass-border` | `rgba(148, 163, 184, 0.08)` | Glass border |
| `--glass-blur` | `20px` | Increased blur for dark surfaces |
| `--glass-saturate` | `160%` | Dark mode saturate |
| `--surface-overlay` | `rgba(11, 17, 32, 0.85)` | Modal overlay |
| `--focus-ring` | `rgba(46, 201, 221, 0.45)` | Focus ring (brighter in dark) |
| `--glow-primary` | `rgba(46, 201, 221, 0.2)` | Primary glow (brighter) |
| `--glow-accent` | `rgba(251, 191, 36, 0.15)` | Accent glow |

### 1.2 Surface Elevation System

Five elevation tiers. Each tier defines background, border, and shadow values.

| Tier | CSS Class | Light BG | Dark BG | Shadow |
|------|-----------|----------|---------|--------|
| 0 — Base | `.surface-base` | `--color-bg` | `--color-bg` | none |
| 1 — Raised | `.surface-raised` | `var(--glass-bg)` | `var(--glass-bg)` | `shadow-card` |
| 2 — Float | `.surface-float` | `white` | `surface-800/60` | `shadow-elevated` |
| 3 — Overlay | `.surface-overlay` | `white` | `surface-800/90` | `shadow-2xl` |
| 4 — Modal | `.surface-modal` | `white` | `surface-800` | `shadow-2xl` + backdrop blur |

All Tier 1+ surfaces include:
- `backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate))`
- `border: 1px solid var(--glass-border)`
- `transition: background-color 200ms, border-color 150ms, box-shadow 200ms`

### 1.3 Motion Tokens

Retain existing tokens from Phase 1. Add spring-based presets:

| Token | Value | Use Case |
|-------|-------|----------|
| `--spring-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Overshoot for popups, tooltips |
| `--spring-smooth` | `cubic-bezier(0.16, 1, 0.3, 1)` | Page transitions, panel slides |
| `--spring-snappy` | `cubic-bezier(0.22, 1, 0.36, 1)` | Button clicks, tab switches |

All motion tokens must be wrapped in `@media (prefers-reduced-motion: no-preference)` when applied. Reduced-motion fallback: instant transitions (duration: 0ms), no transforms.

### 1.4 Typography Scale

Retain existing `Inter` / `JetBrains Mono` font families. Add explicit scale tokens:

| Token | Size | Weight | Line Height | Use |
|-------|------|--------|-------------|-----|
| `--text-display` | `2rem` / `32px` | 700 | 1.2 | Page titles |
| `--text-heading` | `1.25rem` / `20px` | 600 | 1.3 | Section headings |
| `--text-subheading` | `0.875rem` / `14px` | 600 | 1.4 | Card titles |
| `--text-body` | `0.875rem` / `14px` | 400 | 1.5 | Body copy |
| `--text-caption` | `0.75rem` / `12px` | 500 | 1.4 | Labels, badges |
| `--text-micro` | `0.625rem` / `10px` | 600 | 1.3 | Overlines, status |

### 1.5 Spacing System

Use Tailwind's default 4px grid (`space-1` = 4px, etc.). Define semantic spacing tokens:

| Token | Value | Use |
|-------|-------|-----|
| `--space-page` | `24px` (mobile: `16px`) | Page-level padding |
| `--space-section` | `24px` | Between sections |
| `--space-card` | `20px` (mobile: `16px`) | Card internal padding |
| `--space-inline` | `8px` | Between inline elements |
| `--space-stack` | `12px` | Between stacked elements |

---

## 2. Component Upgrade Rules

### 2.1 Cards

**Upgrade `.card` and `.card-interactive`:**

| Property | Current | Target |
|----------|---------|--------|
| Background | `var(--color-surface-raised)` | `var(--glass-bg)` |
| Backdrop | none | `blur(var(--glass-blur)) saturate(var(--glass-saturate))` |
| Border | `1px solid var(--color-border)` | `1px solid var(--glass-border)` |
| Hover border | `var(--color-text-muted)` | `rgba(20, 168, 192, 0.3)` (keep existing) |
| Inner highlight | none | `inset 0 1px 0 rgba(255,255,255,0.06)` (dark only) |
| Focus | none visible | `outline: 2px solid var(--focus-ring)` + `outline-offset: 2px` |
| Content entry | none | `animate-content-reveal` on data-loaded |

### 2.2 Buttons

**Upgrade `.btn-*` variants:**

| Property | Current | Target |
|----------|---------|--------|
| Primary gradient | `from-primary-500 to-primary-600` | Add `backdrop-filter: blur(8px)` behind ghost variants |
| Focus state | `outline: 2px solid primary` | `box-shadow: 0 0 0 3px var(--focus-ring)` — more visible |
| Disabled | `opacity-50` | `opacity-40` + `filter: grayscale(30%)` |
| Loading state | not implemented | Add `.btn-loading` class: spinner icon + `pointer-events: none` |
| Touch target | varies | Minimum `44px × 44px` tap area (WCAG 2.5.8) |

### 2.3 Navigation (Header + Sidebar)

**Header:**

| Property | Current | Target |
|----------|---------|--------|
| Background | `.glass` (rgba 0.85) | Use `var(--glass-bg)` token (rgba 0.72 for more translucency) |
| Theme toggle | 2-state (Light / Dark) | 3-state (Light / Dark / System) |
| System detect | not implemented | `matchMedia('(prefers-color-scheme: dark)')` listener |
| Store field | `isDarkMode: boolean` | `themeMode: 'light' \| 'dark' \| 'system'` + computed `isDarkMode` |
| Toggle UI | Sun/Moon icon button | Cycle button: Sun → Moon → Monitor icons |

**Sidebar:**

| Property | Current | Target |
|----------|---------|--------|
| Active indicator | Left bar + bg color | Add `var(--glow-primary)` subtle spread behind active item |
| ARIA | none | `role="navigation"`, `aria-label="Main navigation"`, `aria-current="page"` on active |
| Keyboard | click only | Arrow keys navigate items, Enter/Space activate |
| Transition | `transition-all duration-300` | Use `var(--spring-smooth)` for width transitions |
| Mobile overlay | `bg-black/40` | `var(--surface-overlay)` token |

### 2.4 Background Layers

Add a subtle gradient mesh to the main content area to add depth:

| Layer | Light | Dark |
|-------|-------|------|
| Base | `--color-bg` | `--color-bg` |
| Gradient accent | `radial-gradient(ellipse at 80% 20%, primary-100/30, transparent 60%)` | `radial-gradient(ellipse at 80% 20%, primary-950/40, transparent 60%)` |

Applied as `::before` pseudo-element on `<main>`, `pointer-events: none`, `position: fixed`.

### 2.5 Toasts

| Property | Current | Target |
|----------|---------|--------|
| Background | `bg-white` / `bg-surface-800` | `var(--glass-bg)` + backdrop-filter |
| Enter | `animate-slide-in-right` | Keep (already implemented) |
| Exit | `animate-slide-out-right` | Keep (already implemented) |
| ARIA | `role="alert"` | Add `aria-live="polite"` on container, `role="status"` on info type |
| Auto-dismiss | timer only | Add progress bar (thin line, `--color-primary`) |
| Focus trap | none | Dismiss button receives focus on keyboard navigation |

### 2.6 Map Container

| Property | Current | Target |
|----------|---------|--------|
| Border | none | `1px solid var(--glass-border)` + `border-radius: var(--radius-xl)` |
| Shadow | none | `shadow-card` |
| Loading | spinner | Skeleton map placeholder with `.charge-pulse` class |
| Marker entry | none defined in JSX | Use CSS class `.marker-bounce-in` on programmatic marker add |
| ARIA | none | `role="application"`, `aria-label="EV route map"`, `aria-roledescription="Interactive map"` |

---

## 3. Animation Standards

### 3.1 Timing Curves

| Name | CSS Value | Use |
|------|-----------|-----|
| `--motion-easing-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | General transitions |
| `--spring-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Element entry (overshoot) |
| `--spring-smooth` | `cubic-bezier(0.16, 1, 0.3, 1)` | Layout shifts, page transitions |
| `--spring-snappy` | `cubic-bezier(0.22, 1, 0.36, 1)` | Micro-interactions (click, toggle) |
| `--motion-easing-decelerate` | `cubic-bezier(0, 0, 0.2, 1)` | Element exit |

### 3.2 Durations

| Action Type | Duration | Token |
|-------------|----------|-------|
| Hover state change | 80–120ms | `--motion-duration-instant` / `--duration-fast` |
| Button press | 80ms | `--motion-duration-instant` |
| Tab switch content | 250ms | `--motion-duration-normal` |
| Page transition | 250ms | `--motion-duration-normal` |
| Sidebar expand/collapse | 300ms | `--duration-slow` |
| Toast enter/exit | 300ms | `--duration-slow` |
| Modal enter | 200ms | `--duration-normal` |
| Loading skeleton shimmer | 2000ms loop | `--motion-duration-glacial` × 3 |

### 3.3 Page Transitions

| Transition | Animation | Easing |
|------------|-----------|--------|
| Tab switch (same level) | `pageEnter` (fade + translateY 8px) | `--spring-smooth` |
| Suspense fallback → content | `contentReveal` (fade + blur 4px→0) | `--motion-easing-default` |
| Modal open | `scaleIn` (scale 0.95→1 + fade) | `--spring-bounce` |
| Modal close | `scaleOut` (scale 1→0.95 + fade) | `--motion-easing-decelerate` |

### 3.4 Micro-Interactions

| Element | Trigger | Effect |
|---------|---------|--------|
| Button | hover | `translateY(-1px)` + shadow elevation |
| Button | active | `scale(0.97)` |
| Card | hover | `scale(1.015) translateY(-2px)` + primary glow + shadow elevation |
| Card | active | `scale(0.985)` |
| Nav item | hover | icon `scale(1.1)` + bg tint |
| Theme toggle | click | Icon rotation crossfade (existing) |
| Toast dismiss | click | `animate-slide-out-right` → remove |

### 3.5 Reduced Motion

When `@media (prefers-reduced-motion: reduce)`:
- All `animation` properties → `animation: none`
- All `transition-duration` → `0ms` (except `opacity` which stays at 150ms)
- No `transform` changes on hover/active
- Page transitions use opacity-only crossfade (no translateY)
- Skeleton shimmer stops (static gray bar)

---

## 4. Accessibility Requirements

### 4.1 Contrast Ratios

| Element | Requirement | Minimum Ratio |
|---------|-------------|---------------|
| Body text on background | WCAG AA | 4.5:1 |
| Large text (≥18px bold, ≥24px) | WCAG AA | 3:1 |
| UI components (borders, icons) | WCAG AA | 3:1 |
| Focus indicator | WCAG AA | 3:1 against adjacent colors |

**Specific audit targets:**

| Pair | Light Ratio | Dark Ratio | Pass? |
|------|-------------|------------|-------|
| `--color-text` on `--color-bg` | `#0F172A` on `#FFF` = 15.4:1 | `#F1F5F9` on `#0B1120` = 14.8:1 | ✅ |
| `--color-text-secondary` on `--color-bg` | `#64748B` on `#FFF` = 4.6:1 | `#94A3B8` on `#0B1120` = 6.3:1 | ✅ |
| `--color-text-muted` on `--color-bg` | `#94A3B8` on `#FFF` = 2.8:1 | `#64748B` on `#0B1120` = 3.8:1 | ⚠️ |
| `primary-500` on white | `#14A8C0` on `#FFF` = 3.1:1 | — | ⚠️ |

**Required fixes:**
1. `--color-text-muted` (light mode): darken to `#6B7280` (≥ 4.5:1) or restrict to decorative-only
2. `primary-500` as text on white: use `primary-700` (`#116F82`, 5.8:1) for text, keep `primary-500` for buttons with white text
3. Any glass surface text: verify contrast against effective rendered background (not just declared bg)

### 4.2 Focus States

Every interactive element must show a visible focus indicator:

| Element Type | Focus Style |
|--------------|-------------|
| Buttons | `box-shadow: 0 0 0 3px var(--focus-ring); outline: none` |
| Links | `outline: 2px solid var(--focus-ring); outline-offset: 2px` |
| Inputs | `border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--focus-ring)` (existing) |
| Cards (interactive) | `outline: 2px solid var(--focus-ring); outline-offset: 2px` |
| Nav items | Ring + visible bg change |
| Map (application) | `outline: 3px solid var(--focus-ring); outline-offset: -3px` |

Focus indicators must only show on `focus-visible` (keyboard), not on mouse click.

### 4.3 Keyboard Navigation

| Component | Keys | Behavior |
|-----------|------|----------|
| Sidebar nav | `ArrowDown/ArrowUp` | Move focus between items |
| Sidebar nav | `Enter/Space` | Activate focused item |
| Sidebar nav | `Home/End` | Jump to first/last item |
| Theme toggle | `Enter/Space` | Cycle Light → Dark → System |
| Toast | `Escape` | Dismiss topmost toast |
| Toast dismiss button | `Enter/Space` | Dismiss specific toast |
| Tab panels | `Tab` | Move focus through focusable content |
| Mobile sidebar | `Escape` | Close overlay |

### 4.4 ARIA Attributes

| Component | Required ARIA |
|-----------|---------------|
| `<header>` | `role="banner"` (implicit with `<header>`) |
| Sidebar `<nav>` | `role="navigation"`, `aria-label="Main navigation"` |
| Active nav item | `aria-current="page"` |
| Theme toggle | `aria-label="Theme: [current]. Click to switch."` |
| Toast container | `aria-live="polite"`, `aria-label="Notifications"` |
| Individual toast | `role="alert"` (error/warning), `role="status"` (info/success) |
| Map container | `role="application"`, `aria-label="EV route map"` |
| Collapsible sidebar | `aria-expanded="true/false"` on toggle button |
| Mobile sidebar overlay | `aria-modal="true"`, focus trap |

### 4.5 Skip Navigation

Add a skip link as the first focusable element:
- Visible only on `:focus`
- Text: "Skip to main content"
- Target: `<main id="main-content">`

---

## 5. Responsive Rules

### 5.1 Breakpoints

Use existing Tailwind breakpoints. Add semantic aliases:

| Alias | Tailwind | Value | Layout |
|-------|----------|-------|--------|
| Mobile | `xs` / default | `< 475px` | Single column, no sidebar |
| Mobile L | `sm` | `≥ 640px` | Single column, header condensed |
| Tablet | `md` | `≥ 768px` | 2-column grid, no sidebar |
| Desktop | `lg` | `≥ 1024px` | Sidebar + main content |
| Wide | `xl` | `≥ 1280px` | Sidebar expanded + wide content |

### 5.2 Layout Shift Prevention

| Rule | Implementation |
|------|----------------|
| Sidebar width | CSS `width` transition, not `display: none` toggle |
| Card grids | `grid-template-columns` with `minmax()` — no content reflow |
| Images/map | `aspect-ratio` + skeleton placeholder before load |
| Font loading | `font-display: swap` + matching fallback size-adjust |
| Skeleton → content | Fixed-height containers, `animate-content-reveal` (no height shift) |

### 5.3 Touch Interaction Tuning

| Rule | Value |
|------|-------|
| Minimum touch target | `44px × 44px` (WCAG 2.5.8) |
| Touch padding on nav items | `py-3` minimum on mobile |
| Swipe-to-dismiss toasts | Not in scope (Phase 4, future enhancement) |
| Active state duration | `120ms` minimum for visual feedback |
| Scroll behavior | `scroll-behavior: smooth` (unless reduced-motion) |
| Hover-only styles | `@media (hover: hover)` wrapper — no hover effects on touch |

---

## 6. Theme System Upgrade

### 6.1 Store Changes

| Field | Current | Target |
|-------|---------|--------|
| `isDarkMode: boolean` | 2-state | Keep as computed getter |
| `themeMode` | not present | `'light' \| 'dark' \| 'system'` — persisted |
| `toggleDarkMode()` | flips boolean | Replace with `cycleTheme()`: light → dark → system → light |
| `setThemeMode(mode)` | not present | Direct setter |

### 6.2 System Preference Detection

1. On mount, read `window.matchMedia('(prefers-color-scheme: dark)')`
2. Add `change` event listener for real-time system theme changes
3. When `themeMode === 'system'`, derive `isDarkMode` from media query
4. Listener cleanup in `useEffect` return

### 6.3 Theme Toggle UI

Replace current Sun/Moon button with 3-icon cycle:
- Light mode: `Sun` icon (amber)
- Dark mode: `Moon` icon (surface-600)
- System mode: `Monitor` icon (primary)
- `aria-label`: "Theme: Light", "Theme: Dark", "Theme: System"
- Crossfade animation between icons (existing pattern)

---

## 7. Verification Criteria

### 7.1 Build & Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Bundle size (gzipped) | ≤ 170 kB | `npm run build` output |
| TypeScript | 0 errors | `npx tsc --noEmit` |
| First Contentful Paint | ≤ 1.2s | Lighthouse (localhost) |
| Largest Contentful Paint | ≤ 2.0s | Lighthouse (localhost) |
| Cumulative Layout Shift | ≤ 0.1 | Lighthouse (localhost) |
| Total Blocking Time | ≤ 200ms | Lighthouse (localhost) |

### 7.2 Accessibility

| Metric | Target | Tool |
|--------|--------|------|
| Lighthouse Accessibility | ≥ 95 | Lighthouse |
| Color contrast | All text ≥ 4.5:1, large text ≥ 3:1 | Manual audit + aXe |
| Keyboard navigation | All interactive elements reachable | Manual tab-through |
| Focus visible | All focused elements have visible indicator | Manual audit |
| Skip link | Present and functional | Manual test |
| ARIA landmarks | banner, navigation, main, contentinfo | aXe audit |

### 7.3 Responsive

| Test | Criteria |
|------|----------|
| 375px (iPhone SE) | No horizontal overflow, touch targets ≥ 44px |
| 768px (iPad) | 2-column layout, sidebar hidden |
| 1024px (Desktop) | Sidebar visible, 3-column card grid |
| 1440px (Wide) | Content centered, no excessive whitespace |
| Resize animation | No layout shifts during window resize |

### 7.4 Visual Consistency

| Test | Criteria |
|------|----------|
| Glass surfaces | Consistent blur + border on all elevated surfaces |
| Dark ↔ Light | No flash of wrong theme on page load |
| System theme | Matches OS preference when set to "System" |
| Reduced motion | No transforms, no animation (opacity-only) |
| Theme persistence | Theme survives page reload (localStorage) |

---

## File Impact Estimate

| File | Change Type | Scope |
|------|-------------|-------|
| `index.css` | MODIFY | Add glass tokens, surface classes, typography tokens, spacing tokens, focus ring utility, skip link, reduced-motion global rules, background gradient layer |
| `tailwind.config.ts` | MODIFY | Add spring easing tokens, typography scale (if using theme extend) |
| `store.ts` | MODIFY | Add `themeMode` field, `cycleTheme()`, `setThemeMode()`. Keep `isDarkMode` as computed |
| `App.tsx` | MODIFY | Add system theme listener, skip link, main landmark ID |
| `Header.tsx` | MODIFY | 3-state theme toggle, ARIA labels |
| `Sidebar.tsx` | MODIFY | ARIA navigation, keyboard handlers, aria-current |
| `ToastContainer.tsx` | MODIFY | aria-live container, role differentiation, progress bar |
| `NetworkMap.tsx` | MODIFY | ARIA application role, container styling |
| `StatCard.tsx` | MODIFY | Glass surface upgrade |
| `RouteCard.tsx` | MODIFY | Glass surface upgrade, focus state |
| `PageLoader.tsx` | MODIFY | Fixed-height skeleton, reduced-motion static |
| `Dashboard.tsx` | MODIFY | Background gradient layer, responsive grid |
