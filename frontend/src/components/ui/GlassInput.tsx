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
        'bg-white/[0.02] backdrop-blur-2xl border-white/[0.05]',
        'placeholder:text-slate-500',
        'focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald/50',
        'transition-all duration-200',
        error && 'border-rose/60 focus:ring-rose/40',
        className,
      )}
      {...props}
    />
  ),
);
GlassInput.displayName = 'GlassInput';
export default GlassInput;
