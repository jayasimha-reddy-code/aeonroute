import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { cn } from '../../lib/utils';

interface AnimatedNumberProps {
  /** The numeric value to animate to */
  value: number;
  /** Text to display before the number (e.g., "$") */
  prefix?: string;
  /** Text to display after the number (e.g., " kWh", "%") */
  suffix?: string;
  /** Number of decimal places (default: 0) */
  decimals?: number;
  /** Additional class names */
  className?: string;
}

const AnimatedNumber = memo<AnimatedNumberProps>(
  ({ value, prefix = '', suffix = '', decimals = 0, className }) => {
    const shouldReduce = useReducedMotion();
    const display = useAnimatedNumber(value, {
      decimals,
      disabled: shouldReduce ?? false,
    });

    return (
      <span className={cn('tabular-nums', className)}>
        {prefix}
        <motion.span>{display}</motion.span>
        {suffix}
      </span>
    );
  },
);
AnimatedNumber.displayName = 'AnimatedNumber';
export default AnimatedNumber;
