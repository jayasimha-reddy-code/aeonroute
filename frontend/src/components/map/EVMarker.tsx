import { memo } from 'react';
import { Marker } from 'react-map-gl/maplibre';
import { cn } from '../../lib/utils';

interface EVMarkerProps {
  position: [number, number] | null;
  bearing: number;
  isCharging: boolean;
  vehicleColor?: string;
}

export const EVMarker = memo(function EVMarker({ position, bearing, isCharging, vehicleColor }: EVMarkerProps) {
  if (!position) return null;

  const bodyColor = vehicleColor ?? (isCharging ? '#f59e0b' : '#10b981');

  return (
    <Marker longitude={position[0]} latitude={position[1]} anchor="center">
      <div className="relative">
        {/* Charging pulse ring */}
        {isCharging && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-2 border-amber-400 animate-ping opacity-40" />
          </div>
        )}

        {/* Car Icon — top-down silhouette, nose pointing up (bearing 0) */}
        <div
          className="relative z-10 transition-transform duration-100"
          style={{ transform: `rotate(${bearing}deg)` }}
        >
          <svg
            width="28"
            height="36"
            viewBox="0 0 28 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-lg"
          >
            {/* Wheels — four corners */}
            <rect x="1" y="4" width="6" height="9" rx="3" fill="#111827" opacity="0.85" />
            <rect x="21" y="4" width="6" height="9" rx="3" fill="#111827" opacity="0.85" />
            <rect x="1" y="23" width="6" height="9" rx="3" fill="#111827" opacity="0.85" />
            <rect x="21" y="23" width="6" height="9" rx="3" fill="#111827" opacity="0.85" />
            {/* Car body */}
            <rect
              x="5" y="2" width="18" height="32" rx="5"
              fill={bodyColor}
              className="transition-colors duration-300"
            />
            {/* Windshield (front — top) */}
            <rect x="7" y="4" width="14" height="9" rx="2" fill="white" opacity="0.35" />
            {/* Rear window (bottom) */}
            <rect x="7" y="23" width="14" height="7" rx="1.5" fill="white" opacity="0.2" />
            {/* Body outline */}
            <rect x="5" y="2" width="18" height="32" rx="5" stroke="white" strokeWidth="1.5" fill="none" />
          </svg>
        </div>

        {/* Glow effect */}
        <div
          className={cn(
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full blur-md -z-10',
            isCharging ? 'bg-amber-400/50' : 'bg-emerald-500/40',
          )}
        />
      </div>
    </Marker>
  );
});

