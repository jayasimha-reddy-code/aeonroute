import { useId, useMemo } from 'react';
import { cn } from '../../lib/utils';

interface NeonSliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  icon?: string;
}

export function NeonSlider({ label, value, onChange, min, max, step = 1, unit, disabled, icon }: NeonSliderProps) {
  const id = useId();
  const fillPct = useMemo(() => ((value - min) / (max - min)) * 100, [value, min, max]);

  return (
    <div className={cn('space-y-2', disabled && 'opacity-40 pointer-events-none')}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm text-slate-400 flex items-center gap-1.5">
          {icon && <span className="text-xs">{icon}</span>}
          {label}
        </label>
        <span className="text-sm text-white font-medium tabular-nums">
          {step < 1 ? value.toFixed(2) : value}
          {unit && <span className="text-xs text-slate-500 ml-0.5">{unit}</span>}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="neon-slider w-full"
        style={{ '--fill-pct': `${fillPct}%` } as React.CSSProperties}
      />
    </div>
  );
}

export default NeonSlider;
