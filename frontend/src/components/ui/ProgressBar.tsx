import { cn } from '../../lib/utils';

interface ProgressBarProps {
  value: number; // 0 - 100
  max?: number;
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'accent' | 'success' | 'warning' | 'gradient';
  animated?: boolean;
  className?: string;
}

const sizeStyles: Record<string, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const colorStyles: Record<string, string> = {
  primary:  'bg-emerald',
  accent:   'bg-amber',
  success:  'bg-emerald',
  warning:  'bg-amber',
  gradient: 'bg-gradient-to-r from-emerald via-amber to-emerald',
};

function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  size = 'md',
  variant = 'primary',
  animated = true,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm font-medium text-label">{label}</span>}
          {showValue && (
            <span className="text-sm font-bold text-white">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-white/[0.04] rounded-full overflow-hidden', sizeStyles[size])}>
        <div
          className={cn(
            'h-full rounded-full',
            colorStyles[variant],
            animated && 'transition-all duration-500 ease-out',
          )}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
