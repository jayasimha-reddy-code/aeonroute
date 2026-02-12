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
  success: 'bg-success-100 dark:bg-success-900/40 text-success-700 dark:text-success-300',
  warning: 'bg-warning-100 dark:bg-warning-900/40 text-warning-700 dark:text-warning-300',
  error:   'bg-danger-100 dark:bg-danger-900/40 text-danger-700 dark:text-danger-300',
  info:    'bg-info-100 dark:bg-info-900/40 text-info-700 dark:text-info-300',
  neutral: 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300',
  primary: 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error:   'bg-danger-500',
  info:    'bg-info-500',
  neutral: 'bg-surface-400',
  primary: 'bg-primary-500',
};

function Badge({ variant = 'neutral', dot = false, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors',
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
