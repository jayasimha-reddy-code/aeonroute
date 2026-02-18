import { memo, useMemo } from 'react';
import { Route as RouteIcon, Zap, Clock, Battery, MapPin } from 'lucide-react';
import { Card } from '../ui';
import { cn } from '../../lib/utils';
import { formatDistance, formatEnergy, formatDuration } from '../../lib/utils';
import type { Route } from '../../services/api';
import { computeSegmentMetrics, type SegmentMetric } from '../../lib/geo';

interface RouteTimelineProps {
  route: Route | null;
  posLookup: Record<string, [number, number]> | null;
  currentSegmentIndex?: number;
  className?: string;
}

export const RouteTimeline = memo(function RouteTimeline({
  route,
  posLookup,
  currentSegmentIndex,
  className,
}: RouteTimelineProps) {
  const segments = useMemo<SegmentMetric[]>(() => {
    if (!route || !posLookup) return [];
    return computeSegmentMetrics(route, posLookup);
  }, [route, posLookup]);

  if (!route) {
    return (
      <Card className={cn('mt-4', className)}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-1.5 rounded-lg bg-emerald/10">
            <RouteIcon className="w-3.5 h-3.5 text-emerald" />
          </div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Route Timeline
          </h3>
        </div>
        <p className="text-xs text-muted text-center py-4">Select a route to view segment details</p>
      </Card>
    );
  }

  return (
    <Card className={cn('mt-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-1.5 rounded-lg bg-emerald/10">
          <RouteIcon className="w-3.5 h-3.5 text-emerald" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Route Timeline
          </h3>
          <p className="text-[11px] text-muted">{segments.length} segments</p>
        </div>
      </div>

      {/* Segment list */}
      <div className="max-h-[300px] overflow-y-auto pr-1 space-y-0">
        {segments.map((seg, idx) => {
          const isActive = currentSegmentIndex === idx;
          const progress = segments.length > 0 ? idx / segments.length : 0;
          // Color gradient: green -> yellow -> red
          const hue = Math.round(120 * (1 - progress));

          return (
            <div
              key={idx}
              className={cn(
                'flex items-start gap-3 py-2 px-2 rounded-lg transition-all relative',
                isActive && 'bg-emerald/10 border-l-2 border-emerald',
                !isActive && 'border-l-2 border-transparent',
              )}
            >
              {/* Timeline connector */}
              <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                {seg.isChargingStop ? (
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Zap className="w-3 h-3 text-amber-500" />
                  </div>
                ) : (
                  <div
                    className="w-3 h-3 rounded-full border-2 flex-shrink-0"
                    style={{
                      borderColor: `hsl(${hue}, 70%, 50%)`,
                      backgroundColor: isActive ? `hsl(${hue}, 70%, 50%)` : 'transparent',
                    }}
                  />
                )}
                {idx < segments.length - 1 && (
                  <div
                    className="w-0.5 flex-1 min-h-[16px] mt-1"
                    style={{ backgroundColor: `hsl(${hue}, 70%, 50%)`, opacity: 0.3 }}
                  />
                )}
              </div>

              {/* Segment info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-medium text-white">
                    {seg.fromNode} → {seg.toNode}
                  </span>
                  {seg.isChargingStop && (
                    <span className="text-[10px] text-amber-500 font-medium">CHARGE</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted">
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5" />
                    {formatDistance(seg.distance_km)}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Battery className="w-2.5 h-2.5" />
                    {formatEnergy(seg.energy_kwh)}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {formatDuration(seg.time_minutes)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary row */}
      <div className="mt-3 pt-3 border-t border-white/[0.05]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Total</span>
          <div className="flex items-center gap-3 text-label font-medium">
            <span>{formatDistance(route.distance_km)}</span>
            <span>{formatEnergy(route.energy_kwh)}</span>
            <span>{formatDuration(route.time_minutes)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
});
