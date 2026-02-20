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
    className={cn(
      'bg-[#0a0f16]/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-white/[0.05] transition-all duration-500 ease-out',
      hover && 'glass-hover cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_12px_48px_rgba(0,0,0,0.6)] hover:bg-[#0a0f16]/50',
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
