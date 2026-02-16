import * as matchers from '@testing-library/jest-dom/matchers';
import { expect, vi } from 'vitest';
import React from 'react';

expect.extend(matchers);

// ---------------------------------------------------------------------------
// Framer Motion mock — replace animated components with plain HTML elements
// ---------------------------------------------------------------------------
vi.mock('framer-motion', () => {
  // Filter framer-motion-specific props so they don't leak to DOM elements
  const filterMotionProps = (props: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(props).filter(
        ([key]) =>
          !key.startsWith('animate') &&
          !key.startsWith('initial') &&
          !key.startsWith('exit') &&
          !key.startsWith('transition') &&
          !key.startsWith('variants') &&
          !key.startsWith('whileHover') &&
          !key.startsWith('whileTap') &&
          !key.startsWith('whileFocus') &&
          !key.startsWith('whileDrag') &&
          !key.startsWith('whileInView') &&
          !key.startsWith('drag') &&
          key !== 'layout' &&
          key !== 'layoutId' &&
          key !== 'onAnimationComplete' &&
          key !== 'onAnimationStart',
      ),
    );

  // Proxy returns a simple component for any HTML tag (motion.div, motion.span, etc.)
  const motionHandler = {
    get: (_target: object, prop: string) => {
      return React.forwardRef(({ children, ...props }: any, ref: any) => {
        const tag = typeof prop === 'string' ? prop : 'div';
        return React.createElement(tag, { ...filterMotionProps(props), ref }, children);
      });
    },
  };

  const motion = new Proxy({}, motionHandler);
  // `m` is the lazy-motion variant (same API surface)
  const m = new Proxy({}, motionHandler);

  return {
    motion,
    m,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    LazyMotion: ({ children }: { children: React.ReactNode }) => children,
    domAnimation: {},
    domMax: {},
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
    useMotionValue: (init: number) => {
      let _val = init;
      return { get: () => _val, set: (v: number) => { _val = v; }, on: vi.fn() };
    },
    useTransform: (_source: any, transform?: (v: number) => string) => {
      // If a transform function is given, apply it to initial value for static rendering
      const formatted = transform ? transform(typeof _source?.get === 'function' ? _source.get() : 0) : '0';
      return formatted; // Return the string directly — our mock span renders it as text
    },
    useSpring: (source: any) => source, // passthrough — spring is just the source in tests
    useInView: () => true,
    useReducedMotion: () => false,
  };
});

// ---------------------------------------------------------------------------
// MapLibre GL mock — requires WebGL which jsdom doesn't provide
// ---------------------------------------------------------------------------
vi.mock('maplibre-gl', () => {
  const MockMap = vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    off: vi.fn(),
    remove: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    removeSource: vi.fn(),
    getSource: vi.fn(),
    getLayer: vi.fn(),
    setCenter: vi.fn(),
    setZoom: vi.fn(),
    flyTo: vi.fn(),
    fitBounds: vi.fn(),
    resize: vi.fn(),
    getCanvas: vi.fn().mockReturnValue({ style: {} }),
    getContainer: vi.fn().mockReturnValue(document.createElement('div')),
    loaded: vi.fn().mockReturnValue(true),
  }));
  return { default: { Map: MockMap }, Map: MockMap, Marker: vi.fn() };
});

// ---------------------------------------------------------------------------
// react-map-gl/maplibre mock
// ---------------------------------------------------------------------------
vi.mock('react-map-gl/maplibre', () => ({
  default: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-map' }, children),
  Map: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-map' }, children),
  Marker: () => React.createElement('div', { 'data-testid': 'mock-marker' }),
  Popup: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-popup' }, children),
  Source: ({ children }: any) => React.createElement('div', null, children),
  Layer: () => null,
  NavigationControl: () => null,
  useMap: () => ({ current: null }),
}));
