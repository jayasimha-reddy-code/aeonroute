import { memo } from 'react';
import type { Route } from '../../services/api';
import { ROUTE_COLORS_ARRAY } from './mapStyles';
import { cn } from '../../lib/utils';

interface RouteLegendProps {
  routes: Route[];
  highlightIndex?: number;
  onRouteSelect?: (idx: number) => void;
}

export const RouteLegend = memo(function RouteLegend({
  routes,
  highlightIndex,
  onRouteSelect,
}: RouteLegendProps) {
  if (routes.length === 0) return null;

  const hiIdx = highlightIndex ?? 0;

  return (
    <div
      className="absolute bottom-3 left-3 z-10 rounded-2xl bg-white/[0.04] backdrop-blur-3xl border border-white/10 border-t-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-2.5 space-y-1"
      style={{ minWidth: 160 }}
    >
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted mb-1.5 px-1">
        Routes
      </p>
      {routes.slice(0, 3).map((route, idx) => {
        const isActive = idx === hiIdx;
        const color = ROUTE_COLORS_ARRAY[idx % ROUTE_COLORS_ARRAY.length];

        return (
          <button
            key={idx}
            onClick={() => onRouteSelect?.(idx)}
            className={cn(
              'flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-left transition-all',
              isActive
                ? 'bg-white/[0.06]'
                : 'hover:bg-white/[0.04]',
            )}
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: color, boxShadow: isActive ? `0 0 8px ${color}` : 'none' }}
            />
            <div className="min-w-0">
              <span
                className={cn(
                  'block text-xs leading-tight',
                  isActive
                    ? 'font-semibold text-white'
                    : 'font-medium text-label',
                )}
              >
                Route {idx + 1}
              </span>
              <span className="block text-[10px] text-muted truncate">
                {route.distance_km.toFixed(1)} km &middot; {route.energy_kwh.toFixed(1)} kWh
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
});