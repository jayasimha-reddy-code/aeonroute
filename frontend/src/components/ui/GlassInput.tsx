import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ error, className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full px-4 py-2.5 rounded-xl border text-sm',
        'glass-surface glass-border',
        'placeholder:text-slate-400 dark:placeholder:text-slate-500',
        'focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-400/50',
        'transition-all duration-200',
        error && 'border-danger-500/60 focus:ring-danger-400/40',
        className,
      )}
      {...props}
    />
  ),
);
GlassInput.displayName = 'GlassInput';
export default GlassInput;
