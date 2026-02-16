import type { Variants, Transition } from 'framer-motion';

// Page transition variants — used with AnimatePresence in App.tsx
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -8, filter: 'blur(2px)' },
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
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

// Stagger item — each child in a stagger container
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
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
