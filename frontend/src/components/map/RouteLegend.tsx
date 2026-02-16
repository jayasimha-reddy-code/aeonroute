import { memo } from 'react';
import type { Route } from '../../services/api';
import { ROUTE_COLORS } from './mapStyles';
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
      className="absolute bottom-3 left-3 z-10 rounded-xl bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] shadow-lg p-2.5 space-y-1"
      style={{ minWidth: 160 }}
    >
      <p className="text-[10px] uppercase tracking-wider font-semibold text-surface-500 mb-1.5 px-1">
        Routes
      </p>
      {routes.slice(0, 3).map((route, idx) => {
        const isActive = idx === hiIdx;
        const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];

        return (
          <button
            key={idx}
            onClick={() => onRouteSelect?.(idx)}
            className={cn(
              'flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-left transition-all',
              isActive
                ? 'bg-surface-100/60 dark:bg-surface-700/60'
                : 'hover:bg-surface-100/40 dark:hover:bg-surface-800/40',
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
                    ? 'font-semibold text-surface-900 dark:text-surface-100'
                    : 'font-medium text-surface-600 dark:text-surface-400',
                )}
              >
                Route {idx + 1}
              </span>
              <span className="block text-[10px] text-surface-500 truncate">
                {route.distance_km.toFixed(1)} km &middot; {route.energy_kwh.toFixed(1)} kWh
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
});