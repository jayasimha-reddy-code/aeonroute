import React from 'react';
import { Route } from '../services/api';
import { Battery, MapPin, Clock, TrendingUp, ChevronRight, Zap, Award } from 'lucide-react';
import { cn, formatDistance, formatEnergy, formatDuration, getScoreColor } from '../lib/utils';
import Badge from './ui/Badge';

interface RouteCardProps {
  route: Route;
  rank: number;
  selected?: boolean;
  onSelect?: () => void;
}

const RouteCard = React.memo(function RouteCard({ route, rank, selected = false, onSelect }: RouteCardProps) {
  const scoreVariant = getScoreColor(route.feasibility_score);
  const isTop = rank === 1;
  const routeTypeLabel = route.route_type === 'q_learning' ? 'Q-Learning Optimized' : route.route_type === 'dijkstra' ? 'Dijkstra Shortest' : null;

  return (
    <div
      onClick={onSelect}
      className={cn(
        'glass glass-hover group cursor-pointer',
        'hover:-translate-y-0.5',
        selected && 'ring-2 ring-emerald/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]',
        isTop && 'border-l-4 border-l-emerald',
      )}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm',
              isTop
                ? 'bg-emerald/10 text-emerald'
                : 'bg-surface-raised text-muted',
            )}
          >
            #{rank}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white">
                Route {rank}
              </p>
              {isTop && (
                <Badge variant="primary" dot>
                  <Award className="w-3 h-3" /> Best
                </Badge>
              )}
              {routeTypeLabel && (
                <Badge variant={route.route_type === 'q_learning' ? 'success' : 'warning'}>
                  {routeTypeLabel}
                </Badge>
              )}
            </div>
            <p className="text-xs text-label font-mono mt-0.5">
              {route.path.slice(0, 3).join(' → ')}
              {route.path.length > 3 && ` → … → ${route.path[route.path.length - 1]}`}
            </p>
          </div>
        </div>

        <ChevronRight className={cn(
          'w-5 h-5 text-label transition-transform group-hover:translate-x-0.5',
          selected && 'text-emerald',
        )} />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricPill icon={MapPin} label="Distance" value={formatDistance(route.distance_km)} />
        <MetricPill icon={Battery} label="Energy" value={formatEnergy(route.energy_kwh)} />
        <MetricPill icon={Clock} label="Time" value={formatDuration(route.time_minutes)} />
        <MetricPill
          icon={TrendingUp}
          label="Score"
          value={`${(route.feasibility_score * 100).toFixed(0)}%`}
          valueClass={cn(
            scoreVariant === 'success' && 'text-emerald',
            scoreVariant === 'warning' && 'text-amber',
            scoreVariant === 'error' && 'text-rose',
          )}
        />
      </div>

      {/* Battery Warning Banner */}
      {route.battery_warning && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-xs text-rose-400">
          <span className="text-base leading-none">⚠️</span>
          Battery insufficient for this route — no charging stations reachable
        </div>
      )}

      {/* Charging Stops */}
      {route.charging_stops.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.05]">
          {/* Injected stops (auto-added by backend) */}
          {route.charging_stop_details && route.charging_stop_details.filter(s => s.injected).length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse flex-shrink-0" />
                <span className="text-xs font-semibold text-amber-400">
                  🔋 {route.charging_stop_details.filter(s => s.injected).length} auto charging stop(s) added
                  {route.charging_time_penalty_minutes && route.charging_time_penalty_minutes > 0
                    ? ` — +${Math.round(route.charging_time_penalty_minutes)} min`
                    : null}
                </span>
              </div>
              {route.charging_stop_details.filter(s => s.injected).map((s, idx) => (
                <div key={idx} className="ml-5 text-xs text-muted">
                  ⚡ {s.name} — Arrive {s.soc_at_arrival.toFixed(0)}% → Charge to {s.charge_to_soc}% · {s.charging_time_minutes} min
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs text-muted">
                {route.charging_stops.length} charging stop{route.charging_stops.length > 1 ? 's' : ''}
                {route.charging_stop_details && route.charging_stop_details.length > 0 ? (
                  <span className="text-label"> — {route.charging_stop_details.map(s => s.name).join(', ')}</span>
                ) : (
                  <span className="text-label"> — Nodes {route.charging_stops.join(', ')}</span>
                )}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Battery Remaining */}
      {route.battery_remaining_pct != null && (
        <div className="mt-2 flex items-center gap-2">
          <Battery className="w-3.5 h-3.5 text-emerald" />
          <span className="text-xs text-muted">
            Battery remaining: <span className={cn('font-semibold', route.battery_remaining_pct > 20 ? 'text-emerald' : 'text-rose')}>{route.battery_remaining_pct}%</span>
          </span>
        </div>
      )}
    </div>
  );
});

RouteCard.displayName = 'RouteCard';

// MetricPill helper function
function MetricPill({
  icon: Icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0a0f16]/30">
      <Icon className="w-3.5 h-3.5 text-label flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-label uppercase tracking-wider leading-none mb-0.5">{label}</p>
        <p className={cn('text-sm font-bold text-white leading-tight', valueClass)}>{value}</p>
      </div>
    </div>
  );
}

export default RouteCard;
