import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const variantStyles: Record<string, string> = {
  default: 'glass-surface border glass-border hover:bg-white/90 dark:hover:bg-slate-800/80',
  primary:
    'glass-blur bg-primary-500/80 border border-primary-400/30 text-white hover:bg-primary-500/95 shadow-btn-primary',
  ghost: 'glass-blur bg-transparent border border-transparent hover:glass-bg hover:border-[var(--glass-border)]',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-6 py-2.5 text-base rounded-xl',
};

const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ variant = 'default', size = 'md', className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        variantStyles[variant],
        sizeStyles[size],
        'font-medium transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);
GlassButton.displayName = 'GlassButton';
export default GlassButton;
