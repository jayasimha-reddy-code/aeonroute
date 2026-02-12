import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

function Skeleton({ className, variant = 'rectangular', width, height, lines }: SkeletonProps) {
  if (lines) {
    return (
      <div className={cn('space-y-2.5', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="skeleton-shimmer h-4"
            style={{ width: i === lines - 1 ? '60%' : '100%' }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'skeleton-shimmer',
        variant === 'circular' && 'rounded-full',
        variant === 'text' && 'h-4 rounded',
        className,
      )}
      style={{ width, height }}
    />
  );
}

/** Pre-built skeleton for stat cards */
export function StatCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="skeleton-shimmer w-12 h-12 rounded-xl" />
      </div>
      <div className="skeleton-shimmer h-3 w-20 mb-2 rounded" />
      <div className="skeleton-shimmer h-7 w-24 rounded" />
    </div>
  );
}

/** Pre-built skeleton for route cards */
export function RouteCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex gap-6">
        <div className="skeleton-shimmer w-16 h-16 rounded-xl" />
        <div className="flex-1 space-y-3">
          <div className="skeleton-shimmer h-4 w-1/3 rounded" />
          <div className="skeleton-shimmer h-3 w-full rounded" />
          <div className="skeleton-shimmer h-3 w-2/3 rounded" />
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
