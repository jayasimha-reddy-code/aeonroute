import type { Variants, Transition } from 'framer-motion';

// Page transition variants — used with AnimatePresence in App.tsx
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const pageTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

// Exit transition — faster than enter for snappy feel
export const pageExitTransition: Transition = {
  duration: 0.2,
  ease: 'easeOut',
};

// Stagger container — parent wraps children that should stagger in
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

// Stagger item — each child in a stagger container — spring entrance
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
};

// Fade-in variant for simple opacity transitions
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } },
};

// Spring config presets
export const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 25 };
export const springGentle = { type: 'spring' as const, stiffness: 200, damping: 20 };
export const springBouncy = { type: 'spring' as const, stiffness: 300, damping: 15 };

/** ── Ultra-premium stagger variants (Phase 12 spec) ── */
export const hyperStaggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const hyperStaggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

/** Card hover preset — use with whileHover on motion.div */
export const cardHover = {
  y: -6,
  transition: { type: 'spring', stiffness: 400, damping: 25 },
};
