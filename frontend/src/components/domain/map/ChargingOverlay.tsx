import { memo } from 'react';
import { Marker } from 'react-map-gl/maplibre';
import { Zap } from 'lucide-react';

interface ChargingOverlayProps {
  isCharging: boolean;
  chargingProgress: number;
  position: [number, number] | null;
}

const SIZE = 52;
const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const ChargingOverlay = memo(function ChargingOverlay({
  isCharging,
  chargingProgress,
  position,
}: ChargingOverlayProps) {
  if (!isCharging || !position) return null;

  const dashOffset = CIRCUMFERENCE * (1 - chargingProgress);

  return (
    <Marker longitude={position[0]} latitude={position[1]} anchor="center">
      <div
        className="relative flex items-center justify-center"
        style={{ width: SIZE, height: SIZE }}
      >
        {/* Background glow */}
        <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-sm" />

        {/* Progress ring */}
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="absolute inset-0 -rotate-90"
        >
          {/* Track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="rgba(245, 158, 11, 0.2)"
            strokeWidth="4"
          />
          {/* Progress */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-100 ease-linear"
          />
        </svg>

        {/* Center icon */}
        <div className="relative z-10 flex flex-col items-center">
          <Zap className="w-4 h-4 text-amber-400 animate-pulse fill-amber-400" />
          <span className="text-[9px] font-bold text-amber-300 mt-0.5 tabular-nums">
            {Math.round(chargingProgress * 100)}%
          </span>
        </div>
      </div>
    </Marker>
  );
});
