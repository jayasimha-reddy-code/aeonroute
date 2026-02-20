import { memo, useState, useEffect, useMemo } from 'react';
import { Marker, Popup } from 'react-map-gl/maplibre';
import api, { type StationData } from '../../services/api';

interface StationMarkersProps {
  /** Node IDs of stations along the active route (for highlight) */
  routeStationIds?: number[];
}

export const StationMarkers = memo(function StationMarkers({ routeStationIds = [] }: StationMarkersProps) {
  const [stations, setStations] = useState<StationData[]>([]);
  const [selected, setSelected] = useState<StationData | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getStations().then((res) => {
      if (!cancelled) setStations(res.stations ?? []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const routeSet = useMemo(() => new Set(routeStationIds), [routeStationIds]);

  if (stations.length === 0) return null;

  return (
    <>
      {stations.map((s) => {
        const isOnRoute = routeSet.has(s.graph_node_id);
        return (
          <Marker
            key={s.id ?? s.graph_node_id}
            longitude={s.lon}
            latitude={s.lat}
            anchor="center"
            onClick={(e) => { e.originalEvent.stopPropagation(); setSelected(s); }}
          >
            <div
              className="relative group cursor-pointer"
              style={{ transform: isOnRoute ? 'scale(1.25)' : 'scale(1)', transition: 'transform 200ms' }}
            >
              {/* Pulse ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="rounded-full animate-ping opacity-30"
                  style={{
                    width: isOnRoute ? 28 : 22,
                    height: isOnRoute ? 28 : 22,
                    backgroundColor: isOnRoute ? '#10b981' : '#f59e0b',
                  }}
                />
              </div>

              {/* Station icon */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="relative z-10 drop-shadow-lg transition-transform duration-200 hover:scale-125"
              >
                {/* Circle bg */}
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill={isOnRoute ? '#10b981' : '#f59e0b'}
                  stroke="white"
                  strokeWidth="2"
                />
                {/* Lightning bolt */}
                <path
                  d="M13.5 6L9 13h3l-1 5 4.5-7H12.5l1-5Z"
                  fill="white"
                  strokeLinejoin="round"
                />
              </svg>

              {/* Glow */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full blur-md -z-10"
                style={{ backgroundColor: isOnRoute ? 'rgba(16,185,129,0.5)' : 'rgba(245,158,11,0.4)' }}
              />
            </div>
          </Marker>
        );
      })}

      {/* Selected station popup */}
      {selected && (
        <Popup
          longitude={selected.lon}
          latitude={selected.lat}
          closeButton
          closeOnClick={false}
          onClose={() => setSelected(null)}
          anchor="bottom"
          offset={16}
          maxWidth="220px"
        >
          <div className="text-xs space-y-1.5 min-w-[160px]">
            <p className="font-semibold text-sm">{selected.name}</p>
            <div className="space-y-0.5 text-[11px]">
              {selected.operator && <p className="text-muted">Operator: {selected.operator}</p>}
              {selected.power_kw > 0 && <p className="text-muted">Power: {selected.power_kw} kW</p>}
              {selected.num_ports > 0 && <p className="text-muted">Ports: {selected.num_ports}</p>}
              <p className="text-muted">
                Charge time (20→80%): ~{Math.round(0.6 * 60 / Math.max(selected.power_kw, 1) * 60)} min
              </p>
            </div>
          </div>
        </Popup>
      )}
    </>
  );
});
