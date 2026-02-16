import { useEffect } from 'react';
import { useSpring, useMotionValue, useTransform, type MotionValue } from 'framer-motion';

interface UseAnimatedNumberOptions {
  /** Spring duration hint in seconds (default: 1.2) */
  duration?: number;
  /** Decimal places to display (default: 0) */
  decimals?: number;
  /** Spring bounce factor (default: 0) */
  bounce?: number;
  /** Whether to disable animation and show value immediately */
  disabled?: boolean;
}

/**
 * Animates a number from 0 (or previous value) to targetValue using spring physics.
 * Returns a MotionValue<string> that updates reactively.
 */
export function useAnimatedNumber(
  targetValue: number,
  options: UseAnimatedNumberOptions = {},
): MotionValue<string> {
  const { decimals = 0, disabled = false } = options;

  const motionValue = useMotionValue(disabled ? targetValue : 0);
  const springValue = useSpring(motionValue, {
    stiffness: 100,
    damping: 30,
    mass: 1,
  });

  const display = useTransform(springValue, (v: number) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v),
  );

  useEffect(() => {
    motionValue.set(targetValue);
  }, [targetValue, motionValue]);

  return display;
}
