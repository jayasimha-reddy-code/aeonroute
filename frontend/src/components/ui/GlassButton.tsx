import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const variantStyles: Record<string, string> = {
  default: 'glass hover:bg-surface-hover',
  primary:
    'backdrop-blur-2xl bg-emerald/80 border border-emerald/30 text-white hover:bg-emerald/95 shadow-glow-emerald',
  ghost: 'backdrop-blur-2xl bg-transparent border border-transparent hover:bg-white/[0.02] hover:border-white/[0.05]',
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
        'font-medium transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
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
