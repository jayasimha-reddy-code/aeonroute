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
  default:     'bg-surface border border-white/[0.05] shadow-card',
  bordered:    'bg-surface border-2 border-white/[0.08]',
  elevated:    'bg-surface border border-white/[0.05] shadow-elevated',
  glow:        'bg-surface border border-white/[0.05] shadow-card hover:shadow-glow-emerald hover:border-emerald/30',
  interactive: 'bg-surface border border-white/[0.05] shadow-card cursor-pointer hover:shadow-card-hover hover:border-white/[0.1] hover:-translate-y-0.5 active:translate-y-0',
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
