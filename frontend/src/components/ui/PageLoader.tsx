/**
 * PageLoader — Premium skeleton for lazy-loaded pages
 * Shows while route chunks are loading
 */
export default function PageLoader() {
    return (
        <div className="p-6 space-y-6" role="status" aria-label="Loading page content">
            {/* Page header skeleton */}
            <div className="animate-pulse">
                <div className="h-8 w-64 bg-white/[0.04] rounded-xl" />
                <div className="h-4 w-96 bg-white/[0.04] rounded-lg mt-2" />
            </div>

            {/* 4-column stat card skeletons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 space-y-3 animate-pulse"
                    >
                        <div className="h-8 w-8 bg-white/[0.04] rounded-lg" />
                        <div className="h-3 w-20 bg-white/[0.04] rounded-lg" />
                        <div className="h-7 w-24 bg-white/[0.04] rounded-lg" />
                    </div>
                ))}
            </div>

            {/* Map-area skeleton */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 animate-pulse">
                <div className="h-[300px] bg-white/[0.04] rounded-xl" />
            </div>

            {/* Right panel skeletons */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 space-y-3 animate-pulse">
                    <div className="h-4 w-32 bg-white/[0.04] rounded-lg" />
                    <div className="h-4 w-full bg-white/[0.04] rounded-lg" />
                    <div className="h-4 w-3/4 bg-white/[0.04] rounded-lg" />
                </div>
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 space-y-3 animate-pulse">
                    <div className="h-4 w-28 bg-white/[0.04] rounded-lg" />
                    <div className="h-4 w-full bg-white/[0.04] rounded-lg" />
                    <div className="h-4 w-5/6 bg-white/[0.04] rounded-lg" />
                </div>
            </div>
        </div>
    );
}
