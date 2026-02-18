import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

const sizeStyles: Record<string, string> = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)} role="status" aria-label={label || 'Loading'}>
      <Loader2 className={cn('animate-spin text-emerald', sizeStyles[size])} />
      {label && (
        <span className="text-sm text-label font-medium">{label}</span>
      )}
    </div>
  );
}

export default Spinner;
