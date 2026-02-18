import { forwardRef, type InputHTMLAttributes } from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  onIconRightClick?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label, error, icon: Icon, iconRight: IconRight, onIconRightClick,
  className, id, ...props
}, ref) => (
  <div className="space-y-1.5">
    {label && (
      <label htmlFor={id} className="block text-xs font-medium text-label">
        {label}
      </label>
    )}
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-label" />}
      <input
        ref={ref}
        id={id}
        className={cn(
          'w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-white',
          'placeholder:text-muted',
          'focus:border-emerald/40 focus:ring-1 focus:ring-emerald/20 focus:shadow-glow-emerald/10',
          'transition-all duration-300',
          Icon && 'pl-10',
          IconRight && 'pr-10',
          error && 'border-rose/40 focus:border-rose/60 focus:ring-rose/20',
          className,
        )}
        {...props}
      />
      {IconRight && (
        <button
          type="button"
          onClick={onIconRightClick}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-label hover:text-white transition-colors"
        >
          <IconRight className="w-4 h-4" />
        </button>
      )}
    </div>
    {error && <p className="text-xs text-rose">{error}</p>}
  </div>
));

Input.displayName = 'Input';
export default Input;
