import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants = {
  primary: 'bg-emerald text-midnight font-semibold hover:bg-emerald/90 hover:shadow-glow-emerald-lg active:scale-[0.97] shadow-[0_0_20px_rgba(16,185,129,0.2)]',
  secondary: 'bg-white/[0.06] text-white border border-white/[0.08] hover:bg-white/[0.10] hover:border-white/[0.14] active:scale-[0.97] shadow-card',
  ghost: 'text-label hover:text-white hover:bg-white/[0.06]',
  danger: 'bg-rose-dim text-rose border border-rose/25 hover:bg-rose/25 hover:shadow-glow-rose active:scale-[0.97]',
  outline: 'border border-white/[0.10] text-label hover:text-white hover:border-white/[0.18] hover:bg-white/[0.05] hover:shadow-card',
};

const sizes = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2.5 gap-2',
  lg: 'text-base px-6 py-3 gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight,
  loading, fullWidth, className, children, disabled, ...props
}, ref) => (
  <button
    ref={ref}
    disabled={disabled || loading}
    className={cn(
      'inline-flex items-center justify-center rounded-xl font-medium',
      'transition-all duration-500 ease-out',
      'disabled:opacity-40 disabled:pointer-events-none',
      variants[variant],
      sizes[size],
      fullWidth && 'w-full',
      className,
    )}
    {...props}
  >
    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon && <Icon className="w-4 h-4" />}
    {children}
    {IconRight && !loading && <IconRight className="w-4 h-4" />}
  </button>
));

Button.displayName = 'Button';
export default Button;
