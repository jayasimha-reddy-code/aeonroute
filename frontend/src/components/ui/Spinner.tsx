import { cn } from '../../lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeStyles: Record<string, string> = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)} role="status" aria-label={label || 'Loading'}>
      <div className={cn('border-2 border-white/[0.08] border-t-emerald rounded-full animate-spin', sizeStyles[size])} />
      {label && (
        <span className="text-sm text-label font-medium">{label}</span>
      )}
    </div>
  );
}

export default Spinner;
