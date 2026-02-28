import { memo } from 'react';
import { Marker } from 'react-map-gl/maplibre';
import { cn } from '../../lib/utils';
import { useVehicleProfile } from '../../store/store';

interface EVMarkerProps {
  position: [number, number] | null;
  bearing: number;
  isCharging: boolean;
  vehicleColor?: string;
}

// ─── Vehicle SVG Silhouettes ─────────────────────────────
// All icons are 28×36, nose pointing up (bearing 0)

interface VehicleSVGProps {
  color: string;
}

/** Tesla Model 3 LR — sleek sedan */
function TeslaSVG({ color }: VehicleSVGProps) {
  return (
    <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
      {/* Wheels */}
      <rect x="1" y="4" width="6" height="9" rx="3" fill="#111827" opacity="0.85" />
      <rect x="21" y="4" width="6" height="9" rx="3" fill="#111827" opacity="0.85" />
      <rect x="1" y="23" width="6" height="9" rx="3" fill="#111827" opacity="0.85" />
      <rect x="21" y="23" width="6" height="9" rx="3" fill="#111827" opacity="0.85" />
      {/* Sleek sedan body — narrow at ends, wide in middle */}
      <path d="M14 2 C8 2 5 4 5 8 L5 28 C5 32 8 34 14 34 C20 34 23 32 23 28 L23 8 C23 4 20 2 14 2Z" fill={color} />
      {/* Large windshield */}
      <rect x="7" y="4" width="14" height="10" rx="2" fill="white" opacity="0.35" />
      {/* Rear window */}
      <rect x="7" y="23" width="14" height="7" rx="1.5" fill="white" opacity="0.2" />
      {/* Body outline */}
      <path d="M14 2 C8 2 5 4 5 8 L5 28 C5 32 8 34 14 34 C20 34 23 32 23 28 L23 8 C23 4 20 2 14 2Z" stroke="white" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

/** Nissan Leaf — compact hatchback (shorter roof, taller body) */
function NissanLeafSVG({ color }: VehicleSVGProps) {
  return (
    <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
      {/* Wheels — wider stance */}
      <rect x="0" y="5" width="6" height="8" rx="3" fill="#111827" opacity="0.85" />
      <rect x="22" y="5" width="6" height="8" rx="3" fill="#111827" opacity="0.85" />
      <rect x="0" y="23" width="6" height="8" rx="3" fill="#111827" opacity="0.85" />
      <rect x="22" y="23" width="6" height="8" rx="3" fill="#111827" opacity="0.85" />
      {/* Hatchback body — wider, squarer */}
      <rect x="4" y="3" width="20" height="30" rx="4" fill={color} />
      {/* Windshield — less raked */}
      <rect x="6" y="5" width="16" height="9" rx="1.5" fill="white" opacity="0.35" />
      {/* Small rear hatch window — square */}
      <rect x="6" y="22" width="16" height="8" rx="1" fill="white" opacity="0.2" />
      {/* Body outline */}
      <rect x="4" y="3" width="20" height="30" rx="4" stroke="white" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

/** BYD Atto 3 — compact SUV (wider, taller, higher clearance) */
function BydAtto3SVG({ color }: VehicleSVGProps) {
  return (
    <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
      {/* Larger wheels — SUV stance */}
      <rect x="0" y="4" width="7" height="10" rx="3.5" fill="#111827" opacity="0.85" />
      <rect x="21" y="4" width="7" height="10" rx="3.5" fill="#111827" opacity="0.85" />
      <rect x="0" y="22" width="7" height="10" rx="3.5" fill="#111827" opacity="0.85" />
      <rect x="21" y="22" width="7" height="10" rx="3.5" fill="#111827" opacity="0.85" />
      {/* SUV body — wider, boxy roof */}
      <rect x="4" y="2" width="20" height="32" rx="3" fill={color} />
      {/* Flat SUV windshield */}
      <rect x="6" y="4" width="16" height="8" rx="1.5" fill="white" opacity="0.35" />
      {/* Rear window */}
      <rect x="6" y="22" width="16" height="8" rx="1" fill="white" opacity="0.2" />
      {/* Roof rack suggestion */}
      <line x1="8" y1="2" x2="20" y2="2" stroke="white" strokeWidth="1.5" opacity="0.3" />
      {/* Body outline */}
      <rect x="4" y="2" width="20" height="32" rx="3" stroke="white" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

/** Tata Nexon EV — subcompact SUV (same as BYD but narrower, more rounded) */
function TataNexonSVG({ color }: VehicleSVGProps) {
  return (
    <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
      {/* Wheels */}
      <rect x="1" y="5" width="6" height="9" rx="3" fill="#111827" opacity="0.85" />
      <rect x="21" y="5" width="6" height="9" rx="3" fill="#111827" opacity="0.85" />
      <rect x="1" y="22" width="6" height="9" rx="3" fill="#111827" opacity="0.85" />
      <rect x="21" y="22" width="6" height="9" rx="3" fill="#111827" opacity="0.85" />
      {/* Subcompact SUV body — slightly rounded top */}
      <path d="M14 2 C8 2 5 5 5 9 L5 27 C5 31 8 34 14 34 C20 34 23 31 23 27 L23 9 C23 5 20 2 14 2Z" fill={color} />
      {/* Sloped windshield */}
      <path d="M7 9 L7 16 L21 16 L21 9 C21 6 18 4 14 4 C10 4 7 6 7 9Z" fill="white" opacity="0.35" />
      {/* Rear hatch */}
      <rect x="7" y="22" width="14" height="8" rx="1.5" fill="white" opacity="0.2" />
      {/* Body outline */}
      <path d="M14 2 C8 2 5 5 5 9 L5 27 C5 31 8 34 14 34 C20 34 23 31 23 27 L23 9 C23 5 20 2 14 2Z" stroke="white" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

/** MG ZS EV — crossover (mid-size, slightly wider than compact, taller than sedan) */
function MgZsSVG({ color }: VehicleSVGProps) {
  return (
    <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
      {/* Wheels — crossover size */}
      <rect x="0" y="4" width="7" height="9" rx="3.5" fill="#111827" opacity="0.85" />
      <rect x="21" y="4" width="7" height="9" rx="3.5" fill="#111827" opacity="0.85" />
      <rect x="0" y="23" width="7" height="9" rx="3.5" fill="#111827" opacity="0.85" />
      <rect x="21" y="23" width="7" height="9" rx="3.5" fill="#111827" opacity="0.85" />
      {/* Crossover body — wide + slightly taller */}
      <rect x="4" y="2" width="20" height="32" rx="5" fill={color} />
      {/* Mid-slope windshield */}
      <rect x="6" y="4" width="16" height="9" rx="2" fill="white" opacity="0.35" />
      {/* Rear */}
      <rect x="6" y="22" width="16" height="8" rx="1.5" fill="white" opacity="0.2" />
      {/* Body outline */}
      <rect x="4" y="2" width="20" height="32" rx="5" stroke="white" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

// ─── Vehicle Icon Map ─────────────────────────────────────

const VEHICLE_SVG_MAP: Record<string, React.ComponentType<VehicleSVGProps>> = {
  tesla_model_3_lr: TeslaSVG,
  nissan_leaf: NissanLeafSVG,
  byd_atto3: BydAtto3SVG,
  tata_nexon_ev: TataNexonSVG,
  mg_zs_ev: MgZsSVG,
};

// ─── EVMarker Component ───────────────────────────────────

export const EVMarker = memo(function EVMarker({ position, bearing, isCharging, vehicleColor }: EVMarkerProps) {
  if (!position) return null;

  const vehicleProfile = useVehicleProfile();
  const bodyColor = vehicleColor ?? (isCharging ? '#f59e0b' : '#10b981');

  const VehicleSVG = VEHICLE_SVG_MAP[vehicleProfile] ?? TeslaSVG;

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
          <VehicleSVG color={bodyColor} />
        </div>

        {/* Emerald glow effect */}
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


