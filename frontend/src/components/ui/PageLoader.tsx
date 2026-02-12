/**
 * PageLoader — Premium skeleton for lazy-loaded pages
 * Shows while route chunks are loading
 */
export default function PageLoader() {
    return (
        <div className="p-6 space-y-6" role="status" aria-label="Loading page content">
            {/* Page header skeleton */}
            <div className="animate-pulse">
                <div className="h-8 w-64 bg-surface-700/20 rounded-lg skeleton-shimmer" />
                <div className="h-4 w-96 bg-surface-700/10 rounded mt-2 skeleton-shimmer" />
            </div>

            {/* Card grid skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="card p-6 space-y-3 animate-pulse"
                    >
                        <div className="h-6 w-32 bg-surface-700/20 rounded skeleton-shimmer" />
                        <div className="h-4 w-full bg-surface-700/10 rounded skeleton-shimmer" />
                        <div className="h-4 w-3/4 bg-surface-700/10 rounded skeleton-shimmer" />
                    </div>
                ))}
            </div>

            {/* Content area skeleton */}
            <div className="card p-8 space-y-4 animate-pulse">
                <div className="h-6 w-48 bg-surface-700/20 rounded skeleton-shimmer" />
                <div className="h-4 w-full bg-surface-700/10 rounded skeleton-shimmer" />
                <div className="h-4 w-5/6 bg-surface-700/10 rounded skeleton-shimmer" />
                <div className="h-4 w-4/6 bg-surface-700/10 rounded skeleton-shimmer" />
            </div>
        </div>
    );
}
