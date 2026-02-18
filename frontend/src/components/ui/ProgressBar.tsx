import { cn } from '../../lib/utils';

interface ProgressBarProps {
  value: number; // 0 - 100
  max?: number;
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'emerald' | 'amber' | 'rose' | 'cyan' | 'gradient';
  animated?: boolean;
  className?: string;
}

const sizeStyles: Record<string, string> = {
  sm: 'h-1',
  md: 'h-1.5',
  lg: 'h-2.5',
};

const colorStyles: Record<string, string> = {
  emerald:  'bg-emerald',
  amber:    'bg-amber',
  rose:     'bg-rose',
  cyan:     'bg-cyan',
  gradient: 'bg-gradient-to-r from-emerald via-amber to-emerald',
};

function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  size = 'md',
  variant = 'emerald',
  animated = true,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-xs font-medium text-label">{label}</span>}
          {showValue && (
            <span className="text-xs font-bold text-white">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn('w-full bg-white/[0.06] rounded-full overflow-hidden', sizeStyles[size])}
      >
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
