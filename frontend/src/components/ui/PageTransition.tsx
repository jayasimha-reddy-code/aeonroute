import { type ReactNode } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { pageVariants, pageTransition } from '../../lib/motion';

interface PageTransitionProps {
  /** Unique key identifying the current page (e.g., activeTab) */
  pageKey: string;
  children: ReactNode;
}

/**
 * Wraps page content in AnimatePresence for enter/exit transitions.
 * Use inside a LazyMotion provider.
 */
export default function PageTransition({ pageKey, children }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <m.div
        key={pageKey}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
        style={{ willChange: 'opacity, transform, filter' }}
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}
