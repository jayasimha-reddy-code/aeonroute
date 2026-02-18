import { forwardRef, type ReactNode, type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'glow';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  noise?: boolean;
  children: ReactNode;
}

const variantStyles: Record<string, string> = {
  default: 'glass border border-white/[0.05] rounded-xl shadow-card',
  elevated: 'border border-white/[0.05] rounded-xl shadow-card bg-surface-raised backdrop-blur-2xl',
  interactive:
    'glass border border-white/[0.05] rounded-xl shadow-card hover:shadow-card-hover hover:scale-[1.02] hover:border-white/[0.1] active:scale-[0.99] cursor-pointer',
  glow: 'glass border border-white/[0.05] rounded-xl shadow-card hover:shadow-glow-emerald hover:border-emerald/40',
};

const paddingStyles: Record<string, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6 lg:p-8',
};

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ variant = 'default', padding = 'md', noise = false, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        variantStyles[variant],
        paddingStyles[padding],
        'transition-all duration-200',
        noise && '',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
GlassCard.displayName = 'GlassCard';
export default GlassCard;
