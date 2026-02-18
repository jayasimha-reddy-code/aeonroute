import { useRef } from 'react';
import { cn } from '../../lib/utils';

interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  displayValue?: string;
  color?: 'emerald' | 'amber' | 'cyan';
}

export function Slider({ value, min = 0, max = 100, step = 1, onChange, label, displayValue, color = 'emerald' }: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const percent = ((value - min) / (max - min)) * 100;

  const colorMap = {
    emerald: { fill: 'bg-emerald', thumb: 'bg-emerald shadow-glow-emerald', text: 'text-emerald' },
    amber: { fill: 'bg-amber', thumb: 'bg-amber shadow-glow-amber', text: 'text-amber' },
    cyan: { fill: 'bg-cyan', thumb: 'bg-cyan shadow-glow-cyan', text: 'text-cyan' },
  };

  return (
    <div className="space-y-2">
      {(label || displayValue) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-xs font-medium text-label">{label}</span>}
          {displayValue && <span className={cn('text-xs font-mono font-medium', colorMap[color].text)}>{displayValue}</span>}
        </div>
      )}
      <div className="relative" ref={trackRef}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        {/* Track */}
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-300', colorMap[color].fill)}
            style={{ width: `${percent}%` }}
          />
        </div>
        {/* Thumb */}
        <div
          className={cn('absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full transition-all duration-300 pointer-events-none', colorMap[color].thumb)}
          style={{ left: `calc(${percent}% - 8px)` }}
        />
      </div>
    </div>
  );
}

export default Slider;
