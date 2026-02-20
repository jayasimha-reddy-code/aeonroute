import { useEffect, useState } from 'react';
import { Card } from '../ui';
import { Leaf } from 'lucide-react';

interface CarbonSavedCardProps {
  /** 0–100 percentage */
  percentage?: number;
  energyKwh?: number;
  timeHours?: number;
  energyPct?: number;
}

export function CarbonSavedCard({
  percentage = 30,
  energyKwh = 173,
  timeHours = 19,
  energyPct = 56,
}: CarbonSavedCardProps) {
  const [animOffset, setAnimOffset] = useState(283);
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference * (1 - percentage / 100);

  useEffect(() => {
    setAnimOffset(circumference);
    const timer = setTimeout(() => setAnimOffset(targetOffset), 50);
    return () => clearTimeout(timer);
  }, [circumference, targetOffset]);

  return (
    <Card className="group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald/10">
            <Leaf className="w-3.5 h-3.5 text-emerald" />
          </div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Estimated Carbon Saved
          </h3>
        </div>

      </div>

      {/* Progress Ring */}
      <div className="flex justify-center my-4">
        <div className="relative">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <defs>
              <filter id="carbonGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Background circle */}
            <circle
              cx="70" cy="70" r={radius}
              fill="none"
              stroke="#1e293b"
              strokeWidth="10"
            />
            {/* Progress arc */}
            <circle
              cx="70" cy="70" r={radius}
              fill="none"
              stroke="#10b981"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={animOffset}
              transform="rotate(-90 70 70)"
              filter="url(#carbonGlow)"
              className="transition-[stroke-dashoffset] duration-[1.5s] ease-out"
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">{percentage}%</span>
            <span className="text-xs text-slate-400">Estimated</span>
          </div>
        </div>
      </div>

      {/* Sub-metrics */}
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="text-center">
          <p className="text-lg font-bold text-emerald">{energyPct}%</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Energy</p>
        </div>
        <div className="w-px h-8 bg-white/[0.06]" />
        <div className="text-center">
          <p className="text-lg font-bold text-white">{energyKwh}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">kWh</p>
        </div>
        <div className="w-px h-8 bg-white/[0.06]" />
        <div className="text-center">
          <p className="text-lg font-bold text-white">{timeHours}h</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Time</p>
        </div>
      </div>
    </Card>
  );
}

export default CarbonSavedCard;
