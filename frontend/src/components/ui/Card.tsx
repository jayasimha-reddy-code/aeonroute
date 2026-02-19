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
      'bg-white/[0.02] backdrop-blur-[40px] border border-t-white/10 border-l-white/10 border-r-white/5 border-b-white/5 rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)] transition-all duration-500 ease-out',
      hover && 'glass-hover cursor-pointer hover:-translate-y-1.5 hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.9),0_0_24px_rgba(16,185,129,0.15)] hover:bg-white/[0.03]',
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
