/**
 * PageLoader — Premium skeleton for lazy-loaded pages
 * Shows while route chunks are loading
 */
export default function PageLoader() {
    return (
        <div className="p-6 space-y-6" role="status" aria-label="Loading page content">
            {/* Page header skeleton */}
            <div className="animate-pulse">
                <div className="h-8 w-64 bg-white/[0.04] rounded-lg skeleton" />
                <div className="h-4 w-96 bg-white/[0.02] rounded mt-2 skeleton" />
            </div>

            {/* Card grid skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="card p-6 space-y-3 animate-pulse"
                    >
                        <div className="h-6 w-32 bg-white/[0.04] rounded skeleton" />
                        <div className="h-4 w-full bg-white/[0.02] rounded skeleton" />
                        <div className="h-4 w-3/4 bg-white/[0.02] rounded skeleton" />
                    </div>
                ))}
            </div>

            {/* Content area skeleton */}
            <div className="card p-8 space-y-4 animate-pulse">
                <div className="h-6 w-48 bg-white/[0.04] rounded skeleton" />
                <div className="h-4 w-full bg-white/[0.02] rounded skeleton" />
                <div className="h-4 w-5/6 bg-white/[0.02] rounded skeleton" />
                <div className="h-4 w-4/6 bg-white/[0.02] rounded skeleton" />
            </div>
        </div>
    );
}
