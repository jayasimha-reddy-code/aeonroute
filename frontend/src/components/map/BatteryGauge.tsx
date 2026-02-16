import { memo } from 'react';
import { Zap, BatteryCharging } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BatteryGaugeProps {
  soc: number;
  capacityKWh: number;
  isCharging: boolean;
  isSimulating: boolean;
  className?: string;
}

export const BatteryGauge = memo(function BatteryGauge({
  soc,
  capacityKWh,
  isCharging,
  isSimulating,
  className,
}: BatteryGaugeProps) {
  const clampedSOC = Math.max(0, Math.min(100, soc));
  const remainingKWh = ((clampedSOC / 100) * capacityKWh).toFixed(1);

  const barColor =
    clampedSOC > 50
      ? 'bg-success-500'
      : clampedSOC > 20
        ? 'bg-warning-500'
        : 'bg-danger-500';

  const textColor =
    clampedSOC > 50
      ? 'text-success-600 dark:text-success-400'
      : clampedSOC > 20
        ? 'text-warning-600 dark:text-warning-400'
        : 'text-danger-600 dark:text-danger-400';

  return (
    <div
      className={cn(
        'glass-surface border glass-border rounded-xl p-3 transition-all duration-200',
        !isSimulating && 'opacity-60',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        {isCharging ? (
          <BatteryCharging className="w-4 h-4 text-amber-500 animate-pulse" />
        ) : (
          <Zap className={cn('w-4 h-4', isSimulating ? 'text-amber-500' : 'text-surface-400')} />
        )}
        <span className="text-xs font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider">
          Battery
        </span>
      </div>

      {/* Vertical Gauge */}
      <div className="flex items-end gap-3">
        <div className="relative w-8 h-[100px] rounded-lg bg-surface-200 dark:bg-surface-700 overflow-hidden border border-surface-300 dark:border-surface-600">
          {/* Fill */}
          <div
            className={cn(
              'absolute bottom-0 left-0 right-0 rounded-b-md transition-all duration-300 ease-out',
              barColor,
              isCharging && 'animate-pulse',
            )}
            style={{ height: `${clampedSOC}%` }}
          />
          {/* Shimmer during charging */}
          {isCharging && (
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent animate-pulse" />
          )}
          {/* Tick marks */}
          {[25, 50, 75].map((tick) => (
            <div
              key={tick}
              className="absolute left-0 right-0 h-px bg-surface-400/30 dark:bg-surface-500/30"
              style={{ bottom: `${tick}%` }}
            />
          ))}
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-1">
          <p className={cn('text-2xl font-bold tabular-nums leading-none', textColor)}>
            {Math.round(clampedSOC)}%
          </p>
          <p className="text-xs text-surface-500 font-mono">
            {remainingKWh} kWh
          </p>
          {isCharging && (
            <p className="text-xs text-amber-500 font-medium animate-pulse">
              Charging…
            </p>
          )}
          {!isSimulating && (
            <p className="text-[10px] text-surface-400 uppercase tracking-wide mt-1">
              Ready
            </p>
          )}
        </div>
      </div>
    </div>
  );
});
