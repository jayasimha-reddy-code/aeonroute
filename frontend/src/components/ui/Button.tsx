import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2, LucideIcon } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:   'bg-emerald text-white hover:bg-emerald-600 shadow-sm hover:shadow-md hover:shadow-emerald/20 focus-visible:outline-emerald',
  secondary: 'bg-surface-raised text-white hover:bg-surface-hover border border-white/[0.05]',
  ghost:     'text-label hover:bg-surface-hover',
  danger:    'bg-red-600 text-white hover:bg-red-700 shadow-sm focus-visible:outline-red-500',
  accent:    'bg-amber text-white hover:bg-amber-600 shadow-sm hover:shadow-md hover:shadow-amber/20 focus-visible:outline-amber',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2.5',
};

function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-200',
        'focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        'active:scale-[0.98]',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className={cn('animate-spin', size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
      ) : Icon ? (
        <Icon className={cn(size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
      ) : null}
      {children}
      {IconRight && !loading && (
        <IconRight className={cn(size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
      )}
    </button>
  );
}

export default Button;
