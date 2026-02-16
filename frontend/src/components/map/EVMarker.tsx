import { memo } from 'react';
import { Marker } from 'react-map-gl/maplibre';
import { cn } from '../../lib/utils';

interface EVMarkerProps {
  position: [number, number] | null;
  bearing: number;
  isCharging: boolean;
}

export const EVMarker = memo(function EVMarker({ position, bearing, isCharging }: EVMarkerProps) {
  if (!position) return null;

  return (
    <Marker longitude={position[0]} latitude={position[1]} anchor="center">
      <div className="relative">
        {/* Charging pulse ring */}
        {isCharging && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-amber-400 animate-ping opacity-40" />
          </div>
        )}

        {/* EV Icon */}
        <div
          className="relative z-10 transition-transform duration-100"
          style={{ transform: `rotate(${bearing}deg)` }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-lg"
          >
            {/* Car body */}
            <ellipse
              cx="14"
              cy="14"
              rx="8"
              ry="11"
              className={cn(
                'transition-colors duration-300',
                isCharging ? 'fill-amber-400' : 'fill-emerald-500',
              )}
            />
            {/* Car body outline */}
            <ellipse
              cx="14"
              cy="14"
              rx="8"
              ry="11"
              stroke="white"
              strokeWidth="2"
              fill="none"
            />
            {/* Lightning bolt */}
            <path
              d="M15.5 8L11.5 15H14L12.5 20L16.5 13H14L15.5 8Z"
              fill="white"
              stroke="white"
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Glow effect */}
        <div
          className={cn(
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full blur-md -z-10',
            isCharging ? 'bg-amber-400/50' : 'bg-emerald-500/40',
          )}
        />
      </div>
    </Marker>
  );
});
