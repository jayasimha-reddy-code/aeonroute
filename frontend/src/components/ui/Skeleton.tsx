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
            className="bg-white/[0.04] rounded-lg h-4 animate-pulse"
            style={{ width: i === lines - 1 ? '60%' : '100%' }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white/[0.04] rounded-xl animate-pulse',
        variant === 'circular' && 'rounded-full',
        variant === 'text' && 'h-4 rounded-lg',
        className,
      )}
      style={{ width, height }}
    />
  );
}

/** Pre-built skeleton for stat cards */
export function StatCardSkeleton() {
  return (
    <div className="bg-white/[0.02] rounded-2xl border border-white/[0.05] p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="bg-white/[0.04] w-12 h-12 rounded-xl" />
      </div>
      <div className="bg-white/[0.04] h-3 w-20 mb-2 rounded-lg" />
      <div className="bg-white/[0.04] h-7 w-24 rounded-lg" />
    </div>
  );
}

/** Pre-built skeleton for route cards */
export function RouteCardSkeleton() {
  return (
    <div className="bg-white/[0.02] rounded-2xl border border-white/[0.05] p-5 animate-pulse">
      <div className="flex gap-6">
        <div className="bg-white/[0.04] w-16 h-16 rounded-xl" />
        <div className="flex-1 space-y-3">
          <div className="bg-white/[0.04] h-4 w-1/3 rounded-lg" />
          <div className="bg-white/[0.04] h-3 w-full rounded-lg" />
          <div className="bg-white/[0.04] h-3 w-2/3 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/** Composite skeleton matching Dashboard.tsx layout */
export function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8" aria-label="Loading">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <div className="bg-white/[0.04] h-7 w-40 rounded-lg animate-pulse" />
        <div className="bg-white/[0.04] h-4 w-72 rounded-lg animate-pulse" />
      </div>

      {/* 4 stat card skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Map + sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="bg-white/[0.02] rounded-2xl border border-white/[0.05] p-5 animate-pulse">
            <div className="bg-white/[0.04] h-[420px] rounded-xl" />
          </div>
        </div>
        <div className="space-y-5">
          <div className="bg-white/[0.02] rounded-2xl border border-white/[0.05] p-5 animate-pulse space-y-3">
            <div className="bg-white/[0.04] h-4 w-32 rounded-lg" />
            <div className="bg-white/[0.04] h-16 rounded-xl" />
            <div className="bg-white/[0.04] h-16 rounded-xl" />
            <div className="bg-white/[0.04] h-16 rounded-xl" />
          </div>
          <div className="bg-white/[0.02] rounded-2xl border border-white/[0.05] p-5 animate-pulse space-y-3">
            <div className="bg-white/[0.04] h-4 w-28 rounded-lg" />
            <div className="bg-white/[0.04] h-10 rounded-xl" />
            <div className="bg-white/[0.04] h-10 rounded-xl" />
            <div className="bg-white/[0.04] h-10 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Composite skeleton matching Analytics.tsx layout */
export function AnalyticsSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8" aria-label="Loading">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <div className="bg-white/[0.04] h-7 w-36 rounded-lg animate-pulse" />
        <div className="bg-white/[0.04] h-4 w-64 rounded-lg animate-pulse" />
      </div>

      {/* 4 stat card skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* 2 chart placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/[0.02] rounded-2xl border border-white/[0.05] p-5 animate-pulse">
          <div className="bg-white/[0.04] h-4 w-40 mb-4 rounded-lg" />
          <div className="bg-white/[0.04] h-64 rounded-xl" />
        </div>
        <div className="bg-white/[0.02] rounded-2xl border border-white/[0.05] p-5 animate-pulse">
          <div className="bg-white/[0.04] h-4 w-36 mb-4 rounded-lg" />
          <div className="bg-white/[0.04] h-64 rounded-xl" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-white/[0.02] rounded-2xl border border-white/[0.05] p-5 animate-pulse space-y-3">
        <div className="bg-white/[0.04] h-4 w-32 rounded-lg" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="bg-white/[0.04] h-4 flex-1 rounded-lg" />
            <div className="bg-white/[0.04] h-4 w-20 rounded-lg" />
            <div className="bg-white/[0.04] h-4 w-16 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Composite skeleton matching Training.tsx layout */
export function TrainingSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8" aria-label="Loading">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <div className="bg-white/[0.04] h-7 w-32 rounded-lg animate-pulse" />
        <div className="bg-white/[0.04] h-4 w-56 rounded-lg animate-pulse" />
      </div>

      {/* 3 model status card skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white/[0.02] rounded-2xl border border-white/[0.05] p-5 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/[0.04] w-10 h-10 rounded-xl" />
              <div className="space-y-1.5 flex-1">
                <div className="bg-white/[0.04] h-4 w-28 rounded-lg" />
                <div className="bg-white/[0.04] h-3 w-20 rounded-lg" />
              </div>
            </div>
            <div className="bg-white/[0.04] h-24 rounded-xl" />
          </div>
        ))}
      </div>

      {/* Controls area skeleton */}
      <div className="bg-white/[0.02] rounded-2xl border border-white/[0.05] p-5 animate-pulse space-y-4">
        <div className="bg-white/[0.04] h-4 w-36 rounded-lg" />
        <div className="flex gap-3">
          <div className="bg-white/[0.04] h-10 w-32 rounded-xl" />
          <div className="bg-white/[0.04] h-10 w-32 rounded-xl" />
        </div>
        <div className="bg-white/[0.04] h-3 w-full rounded-full" />
      </div>
    </div>
  );
}

export default Skeleton;
