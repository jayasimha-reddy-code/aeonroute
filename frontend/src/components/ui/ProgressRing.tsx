import { cn } from '../../lib/utils';

interface ProgressRingProps {
  value: number;           // 0-100
  size?: number;           // px, default 80
  strokeWidth?: number;    // px, default 6
  color?: 'emerald' | 'amber' | 'rose' | 'cyan';
  label?: string;
  children?: React.ReactNode; // center content
}

const colorMap = {
  emerald: { stroke: '#10B981', glow: 'rgba(16,185,129,0.2)' },
  amber: { stroke: '#F59E0B', glow: 'rgba(245,158,11,0.2)' },
  rose: { stroke: '#EF4444', glow: 'rgba(239,68,68,0.2)' },
  cyan: { stroke: '#14B8A6', glow: 'rgba(20,184,166,0.2)' },
};

export function ProgressRing({ value, size = 80, strokeWidth = 6, color = 'emerald', label, children }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const c = colorMap[color];

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background track */}
          <circle cx={size/2} cy={size/2} r={radius} fill="none"
            stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
          {/* Progress arc */}
          <circle cx={size/2} cy={size/2} r={radius} fill="none"
            stroke={c.stroke} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${c.glow})`, transition: 'stroke-dashoffset 500ms ease-out' }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          {children || <span className="text-sm font-bold text-white">{value}%</span>}
        </div>
      </div>
      {label && <span className="text-xs text-label">{label}</span>}
    </div>
  );
}

export default ProgressRing;
