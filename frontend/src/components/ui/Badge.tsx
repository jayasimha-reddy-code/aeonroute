import React from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-dim text-emerald',
  warning: 'bg-amber-dim text-amber',
  error:   'bg-rose-dim text-rose',
  info:    'bg-blue-dim text-blue',
  neutral: 'bg-surface-raised text-label',
  primary: 'bg-emerald-dim text-emerald',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-emerald',
  warning: 'bg-amber',
  error:   'bg-rose',
  info:    'bg-blue',
  neutral: 'bg-white/[0.1]',
  primary: 'bg-emerald',
};

function Badge({ variant = 'neutral', dot = false, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold',
        variantStyles[variant],
        className,
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
      )}
      {children}
    </span>
  );
}

export default Badge;
