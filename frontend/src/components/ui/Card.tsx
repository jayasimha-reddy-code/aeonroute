import React from 'react';
import { cn } from '../../lib/utils';

type CardVariant = 'default' | 'bordered' | 'elevated' | 'glow' | 'interactive';

interface CardProps {
  variant?: CardVariant;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

const variantStyles: Record<CardVariant, string> = {
  default:     'bg-white dark:bg-surface-800/80 border border-surface-200/80 dark:border-surface-700/50 shadow-card',
  bordered:    'bg-white dark:bg-surface-800/80 border-2 border-surface-200 dark:border-surface-700',
  elevated:    'bg-white dark:bg-surface-800/90 border border-surface-200/60 dark:border-surface-700/40 shadow-elevated',
  glow:        'bg-white dark:bg-surface-800/80 border border-surface-200/80 dark:border-surface-700/50 shadow-card hover:shadow-glow hover:border-primary-500/30 dark:hover:border-primary-500/30',
  interactive: 'bg-white dark:bg-surface-800/80 border border-surface-200/80 dark:border-surface-700/50 shadow-card cursor-pointer hover:shadow-card-hover hover:border-surface-300 dark:hover:border-surface-600 hover:-translate-y-0.5 active:translate-y-0',
};

const paddingStyles: Record<string, string> = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
};

function Card({ variant = 'default', className, padding = 'md', children, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl transition-all duration-250',
        variantStyles[variant],
        paddingStyles[padding],
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

export default Card;
