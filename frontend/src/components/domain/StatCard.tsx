import { memo } from 'react';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import AnimatedNumber from '../ui/AnimatedNumber';

interface StatCardProps {
  title: string;
  value: number | string;
  unit?: string;
  subtitle?: string;
  trend?: { value: number; label?: string };
  icon?: LucideIcon;
  accent?: 'emerald' | 'amber' | 'cyan' | 'rose';
  children?: React.ReactNode; // For inline sparklines or progress rings
  // Backward-compat aliases
  color?: string;
  change?: number;
}

const accentMap = {
  emerald: 'text-emerald',
  amber: 'text-amber',
  cyan: 'text-cyan',
  rose: 'text-rose',
};

const bgMap = {
  emerald: 'bg-emerald-dim',
  amber: 'bg-amber-dim',
  cyan: 'bg-cyan-dim',
  rose: 'bg-rose-dim',
};

function resolveAccent(accent?: string, color?: string): 'emerald' | 'amber' | 'cyan' | 'rose' {
  if (accent && accent in accentMap) return accent as 'emerald' | 'amber' | 'cyan' | 'rose';
  if (color) {
    const map: Record<string, 'emerald' | 'amber' | 'cyan' | 'rose'> = {
      primary: 'emerald', green: 'emerald', accent: 'amber',
      orange: 'amber', blue: 'cyan', purple: 'cyan',
    };
    return map[color] || 'emerald';
  }
  return 'emerald';
}

const glowStyle: Record<string, string> = {
  emerald: 'hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8),0_0_35px_rgba(16,185,129,0.25),inset_0_1px_0_0_rgba(16,185,129,0.25)]',
  amber: 'hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8),0_0_35px_rgba(245,158,11,0.25),inset_0_1px_0_0_rgba(245,158,11,0.25)]',
  cyan: 'hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8),0_0_35px_rgba(20,184,166,0.25),inset_0_1px_0_0_rgba(20,184,166,0.25)]',
  rose: 'hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8),0_0_35px_rgba(239,68,68,0.25),inset_0_1px_0_0_rgba(239,68,68,0.25)]',
};

export default memo(function StatCard({ title, value, unit, subtitle, trend, icon: Icon, accent, color, change, children }: StatCardProps) {
  const resolvedAccent = resolveAccent(accent, color);
  // Support legacy `change` prop → convert to trend
  const resolvedTrend = trend || (change !== undefined ? { value: change } : undefined);

  return (
    <div className={cn(
      'glass glass-hover p-5 group transition-all duration-500 ease-out',
      glowStyle[resolvedAccent],
    )}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bgMap[resolvedAccent])}>
              <Icon className={cn('w-4 h-4', accentMap[resolvedAccent])} />
            </div>
          )}
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</span>
        </div>

      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-bold text-white tabular-nums">
          {typeof value === 'number' ? (
            <AnimatedNumber value={value} />
          ) : (() => {
            // Try to parse "42.5 kWh" or "15 min" style strings
            const match = String(value).match(/^([^0-9]*?)([\d,.]+)(.*?)$/);
            if (match) {
              const [, prefix, numStr, suffix] = match;
              const num = parseFloat(numStr.replace(/,/g, ''));
              if (!isNaN(num)) {
                const decimals = numStr.includes('.') ? numStr.split('.')[1]?.length ?? 0 : 0;
                return <AnimatedNumber value={num} prefix={prefix} suffix={suffix} decimals={decimals} />;
              }
            }
            return value;
          })()}
        </span>
        {unit && <span className="text-sm text-slate-400">{unit}</span>}
      </div>

      {/* Subtitle / Trend */}
      <div className="flex items-center gap-2">
        {resolvedTrend && (
          <span className={cn(
            'inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5',
            resolvedTrend.value >= 0 ? 'bg-emerald-dim text-emerald' : 'bg-rose-dim text-rose',
          )}>
            {resolvedTrend.value >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {resolvedTrend.value >= 0 ? '+' : ''}{resolvedTrend.value}%
            {resolvedTrend.label && <span className="text-label ml-1">{resolvedTrend.label}</span>}
          </span>
        )}
        {subtitle && !resolvedTrend && <span className="text-xs text-muted">{subtitle}</span>}
      </div>

      {/* Optional children (sparkline, progress ring) */}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
});
