import { useSystemStore } from '../../store/store';
import { useCurrentSegmentIndex } from '../../store/simulationStore';
import { Card } from '../ui';
import { ChevronDown, ChevronUp, List, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState } from 'react';

const ROAD_TYPE_COLORS: Record<string, string> = {
  motorway: '#ef4444',
  motorway_link: '#ef4444',
  trunk: '#f97316',
  trunk_link: '#f97316',
  primary: '#eab308',
  primary_link: '#eab308',
  secondary: '#3b82f6',
  secondary_link: '#3b82f6',
  tertiary: '#8b5cf6',
  residential: '#10b981',
  service: '#6b7280',
  living_street: '#14b8a6',
  unclassified: '#64748b',
};

export function SegmentList() {
  const [collapsed, setCollapsed] = useState(false);
  const selectedRoute = useSystemStore((s) => s.selectedRoute);
  const currentSegmentIndex = useCurrentSegmentIndex();

  const rawSegs = (selectedRoute?.geojson?.properties as any)?.segments as
    | Array<{
      from_node: number;
      to_node: number;
      distance_km: number;
      energy_kwh: number;
      mode_energy_kwh?: number;
      cumulative_energy_kwh?: number;
      road_type: string;
    }>
    | undefined;

  const hasRealData = rawSegs && rawSegs.length > 0;

  return (
    <Card className="group">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2.5 group/toggle"
        >
          <div className="p-1.5 rounded-lg bg-blue/10">
            <List className="w-3.5 h-3.5 text-blue" />
          </div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Segment-by-Segment
          </h3>
          {collapsed
            ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            : <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
          }
        </button>
        {hasRealData && (
          <span className="text-xs text-muted">{rawSegs.length} segs</span>
        )}
      </div>

      {!collapsed && (
        <div className="space-y-0 max-h-64 overflow-y-auto pr-1">
          {hasRealData ? rawSegs.map((seg, i) => {
            const isActive = i === currentSegmentIndex;
            const color = ROAD_TYPE_COLORS[seg.road_type] ?? '#64748b';
            const modeEnergyKwh = seg.mode_energy_kwh ?? seg.energy_kwh;
            return (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-3 py-2.5 px-1 rounded-md transition-all duration-200',
                  i < rawSegs.length - 1 && 'border-b border-white/[0.04]',
                  isActive && 'bg-emerald/5 ring-1 ring-emerald/20',
                )}
              >
                {/* Status dot */}
                <span
                  className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', isActive && 'animate-pulse')}
                  style={{ backgroundColor: color, boxShadow: isActive ? `0 0 8px ${color}` : `0 0 4px ${color}55` }}
                />
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm truncate', isActive ? 'text-white font-semibold' : 'text-slate-300')}>
                    {seg.road_type} — {seg.from_node}→{seg.to_node}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {seg.distance_km.toFixed(3)} km · {(modeEnergyKwh * 1000).toFixed(1)} Wh
                    {seg.cumulative_energy_kwh != null && (
                      <span className="ml-1 text-emerald/70">cumul: {(seg.cumulative_energy_kwh * 1000).toFixed(0)} Wh</span>
                    )}
                  </p>
                </div>
                {/* Energy icon */}
                <Zap className={cn('w-3 h-3 flex-shrink-0', isActive ? 'text-amber-400 animate-pulse' : 'text-slate-600')} />
              </div>
            );
          }) : (
            <p className="text-xs text-muted py-4 text-center">Generate a route to see segment breakdown</p>
          )}
        </div>
      )}
    </Card>
  );
}

export default SegmentList;
