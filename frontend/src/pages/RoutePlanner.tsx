import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { hyperStaggerContainer, hyperStaggerItem } from '../lib/motion';
import { useSystemStore, useEnergyWeight, useBatteryCapacity, useVehicleProfile, useSimulationScale, useSettings, useAddActivity } from '../store/store';
import api, { geoJSONRouteToLegacy } from '../services/api';
import NetworkMap from '../components/NetworkMap';
import RouteCard from '../components/RouteCard';
import PageHeader from '../components/PageHeader';
import { Card, Button, EmptyState, Spinner } from '../components/ui';
import { ViewToggle } from '../components/ui/ViewToggle';
import { Map, MapPin, Navigation, Sparkles, Zap, Play, Pause, RotateCcw, Leaf, Mountain } from 'lucide-react';
import { cn } from '../lib/utils';
import { RouteCardSkeleton } from '../components/ui/Skeleton';
import { buildPosLookup } from '../lib/geo';
// useEVSimulation import removed — replaced by global simulationStore (Wave 1)
import { useSimulationStore } from '../store/simulationStore';

import { RouteTimeline } from '../components/map/RouteTimeline';
import { WaypointList, type Waypoint } from '../components/route/WaypointList';
import { ElevationProfile, type ElevationPoint } from '../components/route/ElevationProfile';
import { CarbonSavedCard } from '../components/route/CarbonSavedCard';
import { SegmentList } from '../components/route/SegmentList';

/** Hyderabad landmark presets */
const LANDMARKS = [
  { label: 'Charminar', lat: 17.3616, lon: 78.4747 },
  { label: 'HITEC City', lat: 17.4435, lon: 78.3772 },
  { label: 'Secunderabad Stn', lat: 17.4344, lon: 78.5013 },
  { label: 'Gachibowli', lat: 17.4401, lon: 78.3489 },
  { label: 'Kukatpally', lat: 17.4849, lon: 78.3903 },
  { label: 'Begumpet', lat: 17.4437, lon: 78.4672 },
];

function RoutePlanner() {
  const { roadNetwork, generatedRoutes, setGeneratedRoutes, selectedRoute, setSelectedRoute, currentEVState, setEVState, addToast } = useSystemStore();
  const addActivity = useAddActivity();
  const energyWeight = useEnergyWeight();
  const settingsBattery = useBatteryCapacity();
  const vehicleProfile = useVehicleProfile();
  const simulationScale = useSimulationScale();
  const settings = useSettings();
  const units = settings.units;
  const KM_TO_MI = 0.621371;
  const toDistDisplay = (km: number) =>
    units === 'imperial' ? `${(km * KM_TO_MI).toFixed(1)} mi` : `${km.toFixed(1)} km`;
  const [searchParams] = useSearchParams();
  const [sourceLat, setSourceLat] = useState(17.3616);
  const [sourceLon, setSourceLon] = useState(78.4747);
  const [destLat, setDestLat] = useState(17.4435);
  const [destLon, setDestLon] = useState(78.3772);
  const [sourceLabel, setSourceLabel] = useState('Charminar');
  const [destLabel, setDestLabel] = useState('HITEC City');

  // Pre-fill destination from URL params (set by Stations "Route Here" button)
  useEffect(() => {
    const pLat = parseFloat(searchParams.get('destLat') ?? '');
    const pLon = parseFloat(searchParams.get('destLon') ?? '');
    const pLabel = searchParams.get('destLabel') ?? '';
    if (!isNaN(pLat) && !isNaN(pLon)) {
      setDestLat(pLat);
      setDestLon(pLon);
      if (pLabel) setDestLabel(pLabel);
      setWaypoints((prev) => prev.map((wp, i) =>
        i === prev.length - 1 ? { ...wp, lat: pLat, lon: pLon, label: pLabel || wp.label } : wp
      ));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync EV battery capacity from settings
  useEffect(() => {
    setEVState({ ...currentEVState, battery_capacity_kwh: settingsBattery });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsBattery]);

  const [loading, setLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState<number | undefined>(undefined);
  const [routeType, setRouteType] = useState<'fast' | 'eco' | 'scenic'>('fast');
  const [speedMultiplier, setSpeedMultiplierLocal] = useState<1 | 2 | 4>(1);
  const setSpeedMultiplier = (s: 1 | 2 | 4) => {
    setSpeedMultiplierLocal(s);
    simState.setSpeedMultiplier(s); // sync to global engine
  };
  const [elevationData, setElevationData] = useState<ElevationPoint[]>([]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { id: 'wp-start', label: 'Charminar', type: 'start', lat: 17.3616, lon: 78.4747 },
    { id: 'wp-end', label: 'HITEC City', type: 'end', lat: 17.4435, lon: 78.3772 },
  ]);

  // Auto-regenerate route when route type changes (300ms debounce)
  const autoRegenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!roadNetwork) return;
    const startWp = waypoints[0];
    const endWp = waypoints[waypoints.length - 1];
    const sLat = startWp.lat ?? sourceLat;
    const sLon = startWp.lon ?? sourceLon;
    const dLat = endWp.lat ?? destLat;
    const dLon = endWp.lon ?? destLon;
    // Only auto-regen if source and destination are defined and different
    if (sLat === dLat && sLon === dLon) return;
    if (autoRegenTimer.current) clearTimeout(autoRegenTimer.current);
    autoRegenTimer.current = setTimeout(() => {
      handleGenerateRoutes();
    }, 300);
    return () => {
      if (autoRegenTimer.current) clearTimeout(autoRegenTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeType]);

  const posLookup = useMemo(() => roadNetwork ? buildPosLookup(roadNetwork) : null, [roadNetwork]);

  // ── Global Simulation Store (replaces useEVSimulation hook) ──────────
  // The SimulationEngine singleton owns the rAF loop — it survives navigation.
  const simState = useSimulationStore();
  const startSim = () => simState.startSimulation({
    route: selectedRoute!,
    posLookup,
    startSOC: currentEVState.battery_soc,
    batteryCapacityKWh: currentEVState.battery_capacity_kwh,
    speedMultiplier,
    routeMode: routeType,
  });
  const pauseSim = () => simState.pauseSimulation();
  const resumeSim = () => simState.resumeSimulation();
  const resetSim = () => simState.resetSimulation();

  const handleGenerateRoutes = async () => {
    if (!roadNetwork) {
      addToast({ type: 'warning', title: 'No Network', message: 'Road network must be loaded first.' });
      return;
    }
    // Use first and last waypoint for source/dest
    const startWp = waypoints[0];
    const endWp = waypoints[waypoints.length - 1];
    const sLat = startWp.lat ?? sourceLat;
    const sLon = startWp.lon ?? sourceLon;
    const dLat = endWp.lat ?? destLat;
    const dLon = endWp.lon ?? destLon;
    if (sLat === dLat && sLon === dLon) {
      addToast({ type: 'warning', title: 'Invalid Input', message: 'Source and destination must be different.' });
      return;
    }
    setLoading(true);
    setGeneratedRoutes([]);
    setElevationData([]);
    try {
      const result = await api.generateRoute({
        source_lat: sLat,
        source_lon: sLon,
        dest_lat: dLat,
        dest_lon: dLon,
        battery_soc: currentEVState.battery_soc,
        battery_capacity_kwh: currentEVState.battery_capacity_kwh,
        route_mode: routeType,
        energy_weight: energyWeight,
        vehicle_profile: vehicleProfile,
      });
      // Convert GeoJSON routes to legacy Route format
      const routes = [geoJSONRouteToLegacy(result.route), ...result.alternatives.map(geoJSONRouteToLegacy)];
      setGeneratedRoutes(routes);
      if (routes.length > 0) {
        setSelectedRoute(routes[0]);
        setHighlightIdx(0);
        // Extract elevation profile from response if available
        if (result.route?.properties?.elevation_profile) {
          setElevationData(result.route.properties.elevation_profile.map((pt: any) => ({
            distance_km: pt.distance_km,
            elevation: pt.elevation_m ?? pt.elevation ?? 500,
          })));
        } else {
          // Generate simulated elevation profile
          const numPoints = 30;
          const totalDist = result.route?.properties?.distance_km ?? 10;
          const simElev: ElevationPoint[] = Array.from({ length: numPoints }, (_, i) => {
            const d = (i / (numPoints - 1)) * totalDist;
            const e = 500 + Math.sin(i * 0.4) * 40 + Math.sin(i * 0.15) * 80 + Math.random() * 15;
            return { distance_km: +d.toFixed(2), elevation: +e.toFixed(1) };
          });
          setElevationData(simElev);
        }
        addToast({ type: 'success', title: 'Routes Generated', message: `Found ${routes.length} candidate route${routes.length > 1 ? 's' : ''} (${result.route.properties.route_type === 'q_learning' ? 'Q-Learning Optimized' : 'Dijkstra'}).` });
        const startLabel = waypoints[0]?.label ?? 'Origin';
        const endLabel = waypoints[waypoints.length - 1]?.label ?? 'Destination';
        addActivity('route', `Route generated: ${startLabel} → ${endLabel} (${result.route.properties.distance_km?.toFixed(1) ?? '?'} km)`);
      }
    } catch (error: any) {
      addToast({ type: 'error', title: 'Route Generation Failed', message: error?.message });
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = useCallback((nodeId: number) => {
    // Look up lat/lon from posLookup when clicking map nodes
    if (posLookup) {
      const coord = posLookup[nodeId.toString()];
      if (coord) {
        // coord is [lng, lat]
        if (!selectedRoute) {
          setSourceLat(coord[1]);
          setSourceLon(coord[0]);
          setSourceLabel(`Node ${nodeId}`);
        } else {
          setDestLat(coord[1]);
          setDestLon(coord[0]);
          setDestLabel(`Node ${nodeId}`);
        }
      }
    }
  }, [posLookup, selectedRoute]);

  const batteryColor = currentEVState.battery_soc > 50 ? 'bg-emerald' : currentEVState.battery_soc > 20 ? 'bg-amber' : 'bg-rose';

  return (
    <motion.div
      className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto"
      variants={hyperStaggerContainer}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={hyperStaggerItem}>
        <PageHeader title="Route Planner" subtitle="Generate and compare optimized EV routes with real-time metrics" icon={Map} />
      </motion.div>

      <motion.div variants={hyperStaggerItem} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Control Panel ───────────────────────────── */}
        <div className="lg:col-span-3">
          <Card className="sticky top-20">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-1.5 rounded-lg bg-emerald/10"><Navigation className="w-3.5 h-3.5 text-emerald" /></div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Route Parameters</h3>
            </div>

            {/* Multi-Stop Waypoint List */}
            <WaypointList
              waypoints={waypoints}
              onChange={(updated) => {
                setWaypoints(updated);
                // Sync source/dest for backward compat
                const start = updated[0];
                const end = updated[updated.length - 1];
                if (start.lat && start.lon) { setSourceLat(start.lat); setSourceLon(start.lon); setSourceLabel(start.label); }
                if (end.lat && end.lon) { setDestLat(end.lat); setDestLon(end.lon); setDestLabel(end.label); }
              }}
              landmarks={LANDMARKS}
            />

            {/* Battery */}
            <div className="mb-5">
              <label className="input-label flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Battery SOC
              </label>
              <div className="relative mt-2">
                <input
                  type="range" min={0} max={100} value={currentEVState.battery_soc}
                  onChange={(e) => setEVState({ ...currentEVState, battery_soc: parseFloat(e.target.value) })}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/[0.04] accent-emerald"
                />
                <div className="flex items-center justify-between mt-2.5">
                  <div className="flex items-center gap-2">
                    <div className={cn('h-5 rounded-sm transition-all', batteryColor)} style={{ width: `${Math.max(currentEVState.battery_soc * 0.4, 4)}px` }} />
                    <span className="text-base font-bold text-white">{currentEVState.battery_soc}%</span>
                  </div>
                  <span className="text-xs text-muted font-mono">{currentEVState.battery_capacity_kwh} kWh</span>
                </div>
              </div>
            </div>

            <div className="divider mb-5" />

            <Button variant="primary" fullWidth loading={loading} icon={Sparkles} onClick={handleGenerateRoutes}>
              {loading ? 'Generating…' : 'Generate Routes'}
            </Button>

            {generatedRoutes.length > 0 && (
              <p className="text-xs text-center text-muted mt-3">{generatedRoutes.length} routes found</p>
            )}
          </Card>
        </div>

        {/* ── Results ─────────────────────────────────── */}
        <div className="lg:col-span-9 space-y-5">
          {/* Map Visualization */}
          <Card className="!p-0 overflow-hidden rounded-3xl">
            <div className="h-[460px]">
              {loading && !generatedRoutes.length ? (
                <div className="h-full flex items-center justify-center bg-midnight/50">
                  <Spinner size="lg" label="Generating routes…" />
                </div>
              ) : roadNetwork ? (
                <NetworkMap
                  network={roadNetwork}
                  routes={generatedRoutes}
                  highlightIndex={highlightIdx}
                  onNodeClick={handleNodeClick}
                  onRouteSelect={(idx) => { setHighlightIdx(idx); setSelectedRoute(generatedRoutes[idx]); }}
                  simulationState={simState}
                  routeMode={routeType}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-midnight/50">
                  <Spinner size="lg" label="Loading network…" />
                </div>
              )}
            </div>
          </Card>

          {/* ── Simulation Controller ─────────────────── */}
          {selectedRoute && (
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-xl px-5 py-4">
              {simState.isBatteryDepleted ? (
                /* Battery Depleted State */
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-sm font-semibold text-rose-400">Battery Depleted</span>
                    <span className="text-xs text-muted ml-2">0% SOC reached</span>
                  </div>
                  <Button variant="ghost" icon={RotateCcw} onClick={resetSim}>Reset</Button>
                </div>
              ) : !simState.isSimulating && simState.progress >= 1 ? (
                /* Route Complete State */
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald" />
                    <span className="text-sm font-semibold text-emerald-400">Route Complete</span>
                    {selectedRoute?.energy_kwh && (
                      <span className="text-xs text-muted ml-2">
                        {selectedRoute.energy_kwh.toFixed(1)} kWh used
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" icon={RotateCcw} onClick={resetSim}>Restart</Button>
                </div>
              ) : (
                /* Active Simulation Controls */
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Play/Pause + Reset */}
                  <div className="flex items-center gap-2">
                    {!simState.isSimulating ? (
                      <Button variant="primary" icon={Play} onClick={startSim}>Simulate</Button>
                    ) : simState.isPaused ? (
                      <Button variant="primary" icon={Play} onClick={resumeSim}>Resume</Button>
                    ) : (
                      <Button variant="secondary" icon={Pause} onClick={pauseSim}>Pause</Button>
                    )}
                    {(simState.isSimulating || simState.progress > 0) && (
                      <Button variant="ghost" icon={RotateCcw} onClick={resetSim} />
                    )}
                  </div>

                  {/* Speed pills */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted mr-0.5">Speed</span>
                    {([1, 2, 4] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSpeedMultiplier(s)}
                        className={cn(
                          'text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors',
                          speedMultiplier === s
                            ? 'bg-emerald/20 border-emerald text-emerald'
                            : 'bg-white/[0.04] border-white/10 text-muted hover:text-white hover:border-white/20',
                        )}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>

                  {/* Battery gauge — compact inline */}
                  {simulationScale !== 'light' && (
                    <div className="flex items-center gap-2 flex-1 min-w-[120px]">
                      <Zap className={cn('w-3.5 h-3.5 flex-shrink-0', simState.isBatteryLow ? 'text-amber-400 animate-pulse' : 'text-muted')} />
                      <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            simState.isBatteryLow ? 'bg-amber-400' : 'bg-emerald',
                            simulationScale === 'full' ? 'shadow-[0_0_8px_rgba(16,185,129,0.7)]' : '',
                          )}
                          style={{ width: `${Math.max(0, simState.currentSOC)}%` }}
                        />
                      </div>
                      <span className={cn('text-xs font-mono w-9 text-right', simState.isBatteryLow ? 'text-amber-400' : 'text-white')}>
                        {simState.currentSOC.toFixed(0)}%
                      </span>
                      {simulationScale === 'full' && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {(simState.currentSOC / 100 * currentEVState.battery_capacity_kwh).toFixed(1)} kWh
                        </span>
                      )}
                      {simState.isBatteryLow && (
                        <span className="text-xs text-amber-400 animate-pulse">Low</span>
                      )}
                    </div>
                  )}

                  {/* Distance progress */}
                  {simState.isSimulating && selectedRoute?.distance_km && (
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <span className="text-white font-mono">
                        {toDistDisplay(simState.progress * selectedRoute.distance_km)}
                      </span>
                      <span>/</span>
                      <span>{toDistDisplay(selectedRoute.distance_km)}</span>
                    </div>
                  )}

                  {/* Particle trail indicator for full mode */}
                  {simulationScale === 'full' && simState.isSimulating && !simState.isPaused && (
                    <div className="flex items-center gap-1 text-[10px] text-emerald/60">
                      <span className="animate-ping inline-block w-1 h-1 rounded-full bg-emerald/40" />
                      <span className="animate-ping inline-block w-1 h-1 rounded-full bg-emerald/30 delay-75" />
                      <span className="animate-ping inline-block w-1 h-1 rounded-full bg-emerald/20 delay-150" />
                    </div>
                  )}

                  {/* ETA */}
                  {simState.isSimulating && selectedRoute?.time_minutes && !simState.isCharging && (
                    <div className="text-xs text-muted">
                      ~{Math.max(0, Math.round(selectedRoute.time_minutes * (1 - simState.progress)))} min remaining
                    </div>
                  )}

                  {/* Charging indicator */}
                  {simState.isCharging && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      Charging…
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Route Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                Generated Routes
                {generatedRoutes.length > 0 && <span className="ml-2 text-muted font-normal normal-case">({generatedRoutes.length})</span>}
              </h3>
              <ViewToggle
                options={[
                  { value: 'fast' as const, label: 'Fastest', icon: Zap },
                  { value: 'eco' as const, label: 'Eco', icon: Leaf },
                  { value: 'scenic' as const, label: 'Scenic', icon: Mountain },
                ]}
                value={routeType}
                onChange={setRouteType}
                size="sm"
              />
            </div>
            {/* Route color legend */}
            <div className="flex items-center gap-4 mb-3 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full inline-block" style={{ background: '#3b82f6' }} />
                Fast
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full inline-block" style={{ background: '#10b981' }} />
                Eco
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full inline-block" style={{ background: '#a855f7' }} />
                Scenic
              </span>
            </div>

            {loading ? (
              <div className="space-y-3 animate-stagger">{Array.from({ length: 3 }).map((_, i) => <RouteCardSkeleton key={i} />)}</div>
            ) : generatedRoutes.length > 0 ? (
              <div className="space-y-3 animate-stagger">
                {generatedRoutes.map((route, idx) => (
                  <RouteCard key={idx} route={route} rank={idx + 1} selected={selectedRoute === route} onSelect={() => { setSelectedRoute(route); setHighlightIdx(idx); }} />
                ))}
              </div>
            ) : (
              <Card>
                <EmptyState icon={MapPin} title="No Routes Generated" description="Set your start and destination nodes, adjust battery level, then hit Generate Routes." />
              </Card>
            )}
          </div>

          {/* Route Timeline */}
          {selectedRoute && (
            <RouteTimeline
              route={selectedRoute}
              posLookup={posLookup}
              currentSegmentIndex={simState?.currentSegmentIndex}
            />
          )}

          {/* Elevation Profile */}
          {selectedRoute && elevationData.length > 0 && (
            <ElevationProfile data={elevationData} />
          )}

          {/* Bottom Row: Segment List + Carbon Saved */}
          {selectedRoute && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <SegmentList />
              <CarbonSavedCard
                percentage={Math.max(0,
                  selectedRoute.distance_km && selectedRoute.energy_kwh
                    ? Math.round((1 - selectedRoute.energy_kwh / (selectedRoute.distance_km * 0.25)) * 100)
                    : 0
                )}
                energyKwh={selectedRoute.energy_kwh ? Math.round(selectedRoute.energy_kwh) : 173}
                timeHours={selectedRoute.time_minutes ? Math.round(selectedRoute.time_minutes / 60) : 19}
                energyPct={56}
              />
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default RoutePlanner;
