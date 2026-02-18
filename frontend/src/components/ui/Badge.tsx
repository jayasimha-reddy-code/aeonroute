import React from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'emerald' | 'amber' | 'rose' | 'cyan' | 'blue' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  emerald: 'bg-emerald-dim text-emerald',
  amber:   'bg-amber-dim text-amber',
  rose:    'bg-rose-dim text-rose',
  cyan:    'bg-cyan-dim text-cyan',
  blue:    'bg-blue-dim text-blue',
  neutral: 'bg-white/[0.06] text-label',
};

function Badge({ variant = 'neutral', dot = false, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantStyles[variant],
        className,
      )}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  );
}

export default Badge;
