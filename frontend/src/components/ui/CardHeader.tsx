import { memo } from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

type Accent = 'emerald' | 'amber' | 'cyan' | 'rose' | 'blue';

interface CardHeaderProps {
  /** Lucide icon to display in the accent box. */
  icon: LucideIcon;
  /** Card section title (rendered uppercase via CSS). */
  title: string;
  /** Optional one-liner below the title. */
  subtitle?: string;
  /** Accent colour for the icon box and icon. Defaults to "emerald". */
  accent?: Accent;
  /** Optional right-side slot — badges, action buttons, etc. */
  children?: React.ReactNode;
  className?: string;
}

const bgMap: Record<Accent, string> = {
  emerald: 'bg-emerald-dim',
  amber:   'bg-amber-dim',
  cyan:    'bg-cyan-dim',
  rose:    'bg-rose-dim',
  blue:    'bg-blue-dim',
};

const textMap: Record<Accent, string> = {
  emerald: 'text-emerald',
  amber:   'text-amber',
  cyan:    'text-cyan',
  rose:    'text-rose',
  blue:    'text-blue',
};

/**
 * Shared card section header.
 * Replaces the 30+ repeated icon-box + h3 blocks across all pages.
 *
 * Usage: <CardHeader icon={Zap} title="AI Model Status" accent="emerald" />
 *
 * With right-side slot:
 *   <CardHeader icon={BarChart3} title="Energy Analytics" accent="amber">
 *     <Badge variant="success">Live</Badge>
 *   </CardHeader>
 */
const CardHeader = memo(function CardHeader({
  icon: Icon,
  title,
  subtitle,
  accent = 'emerald',
  children,
  className,
}: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-5', className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={cn('p-1.5 rounded-lg flex-shrink-0', bgMap[accent])}>
          <Icon className={cn('w-3.5 h-3.5', textMap[accent])} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider leading-none">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-muted mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">{children}</div>
      )}
    </div>
  );
});

export { CardHeader };
export default CardHeader;
