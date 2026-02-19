import { cn } from '../../lib/utils';

interface ViewToggleProps<T extends string> {
  options: Array<{ value: T; label: string; icon?: React.ComponentType<{ className?: string }> }>;
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}

export function ViewToggle<T extends string>({ options, value, onChange, size = 'md' }: ViewToggleProps<T>) {
  return (
    <div className="inline-flex items-center rounded-xl bg-white/[0.04] border border-white/[0.06] p-1">
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg font-medium transition-all duration-300',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              isActive
                ? 'bg-emerald/20 text-emerald shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'text-label hover:text-white hover:bg-white/[0.04]'
            )}
          >
            {opt.icon && <opt.icon className="w-3.5 h-3.5" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default ViewToggle;
