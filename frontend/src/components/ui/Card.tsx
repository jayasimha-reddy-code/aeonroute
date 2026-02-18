import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: 'emerald' | 'amber' | 'rose' | 'cyan' | 'none';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const glowMap = {
  emerald: 'shadow-glow-emerald border-emerald/20',
  amber: 'shadow-glow-amber-top border-t-amber/30',
  rose: 'shadow-glow-rose border-rose/20',
  cyan: 'shadow-glow-cyan border-cyan/20',
  none: '',
};

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(({
  hover = false,
  glow = 'none',
  padding = 'md',
  className,
  children,
  ...props
}, ref) => (
  <div
    ref={ref}
    style={{ backgroundColor: 'rgba(15, 20, 26, 0.6)' }}
    className={cn(
      'backdrop-blur-[40px] border border-white/[0.03] border-t-white/[0.15] rounded-2xl shadow-card',
      hover && 'glass-hover',
      glowMap[glow],
      paddingMap[padding],
      className,
    )}
    {...props}
  >
    {children}
  </div>
));

Card.displayName = 'Card';
export default Card;
