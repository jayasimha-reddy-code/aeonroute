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

  return (
    <div
      onClick={onSelect}
      className={cn(
        'card group cursor-pointer transition-all duration-250',
        'hover:shadow-card-hover hover:-translate-y-0.5',
        selected && 'ring-2 ring-primary-500 border-primary-500/30',
        isTop && 'border-l-4 border-l-primary-500',
      )}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm',
              isTop
                ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                : 'bg-surface-100 dark:bg-surface-700 text-surface-500',
            )}
          >
            #{rank}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                Route {rank}
              </p>
              {isTop && (
                <Badge variant="primary" dot>
                  <Award className="w-3 h-3" /> Best
                </Badge>
              )}
            </div>
            <p className="text-xs text-surface-500 dark:text-surface-400 font-mono mt-0.5">
              {route.path.slice(0, 3).join(' → ')}
              {route.path.length > 3 && ` → … → ${route.path[route.path.length - 1]}`}
            </p>
          </div>
        </div>

        <ChevronRight className={cn(
          'w-5 h-5 text-surface-400 transition-transform group-hover:translate-x-0.5',
          selected && 'text-primary-500',
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
            scoreVariant === 'success' && 'text-success-600 dark:text-success-400',
            scoreVariant === 'warning' && 'text-warning-600 dark:text-warning-400',
            scoreVariant === 'error' && 'text-danger-500',
          )}
        />
      </div>

      {/* Charging Stops */}
      {route.charging_stops.length > 0 && (
        <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-700/50 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs text-surface-500">
            {route.charging_stops.length} charging stop{route.charging_stops.length > 1 ? 's' : ''}
            <span className="text-surface-400 dark:text-surface-500"> — Nodes {route.charging_stops.join(', ')}</span>
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
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-800/60">
      <Icon className="w-3.5 h-3.5 text-surface-400 dark:text-surface-500 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-surface-400 dark:text-surface-500 uppercase tracking-wider leading-none mb-0.5">{label}</p>
        <p className={cn('text-sm font-bold text-surface-900 dark:text-surface-100 leading-tight', valueClass)}>{value}</p>
      </div>
    </div>
  );
}

export default RouteCard;
