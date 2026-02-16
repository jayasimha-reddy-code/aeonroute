import { memo } from 'react';
import { cn } from '../lib/utils';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import AnimatedNumber from './ui/AnimatedNumber';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'primary' | 'accent' | 'orange' | 'blue' | 'purple' | 'green';
  change?: number;
  subtitle?: string;
}

const iconBg: Record<string, string> = {
  primary: 'bg-primary-500/10 text-primary-600 dark:text-primary-400',
  accent: 'bg-accent-500/10 text-accent-600 dark:text-accent-400',
  orange: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  blue: 'bg-info-500/10 text-info-600 dark:text-info-400',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  green: 'bg-success-500/10 text-success-600 dark:text-success-400',
};

function renderValue(value: string | number) {
  if (typeof value === 'number') {
    return <AnimatedNumber value={value} className="stat-value text-2xl xl:text-3xl font-bold text-surface-900 dark:text-surface-50 tracking-tight" />;
  }
  // Try to parse "42.5 kWh" or "— min" style strings
  const match = String(value).match(/^([^0-9]*?)([\d,.]+)(.*?)$/);
  if (match) {
    const [, prefix, numStr, suffix] = match;
    const num = parseFloat(numStr.replace(/,/g, ''));
    if (!isNaN(num)) {
      const decimals = numStr.includes('.') ? numStr.split('.')[1]?.length ?? 0 : 0;
      return (
        <AnimatedNumber
          value={num}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
          className="stat-value text-2xl xl:text-3xl font-bold text-surface-900 dark:text-surface-50 tracking-tight"
        />
      );
    }
  }
  // Fallback: non-numeric string
  return <span className="stat-value text-2xl xl:text-3xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">{value}</span>;
}

const StatCard = memo(function StatCard({ title, value, icon: Icon, color, change, subtitle }: StatCardProps) {
  return (
    <div className="card group hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-250">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-2.5 rounded-xl transition-transform group-hover:scale-110', iconBg[color])}>
          <Icon className="w-5 h-5" />
        </div>
        {change !== undefined && (
          <div className={cn('flex items-center gap-1 text-xs font-bold', change >= 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-500')}>
            {change >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {change >= 0 ? '+' : ''}{change}%
          </div>
        )}
      </div>
      <p className="text-xs xl:text-sm font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-1">
        {title}
      </p>
      {renderValue(value)}
      {subtitle && (
        <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
});

StatCard.displayName = 'StatCard';

export default StatCard;
