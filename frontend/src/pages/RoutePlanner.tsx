import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { hyperStaggerContainer, hyperStaggerItem } from '../lib/motion';
import { useSystemStore } from '../store/store';
import api, { geoJSONRouteToLegacy } from '../services/api';
import NetworkMap from '../components/NetworkMap';
import RouteCard from '../components/RouteCard';
import PageHeader from '../components/PageHeader';
import { Card, Button, EmptyState, Spinner, ProgressBar } from '../components/ui';
import { ViewToggle } from '../components/ui/ViewToggle';
import { Map, MapPin, Navigation, Sparkles, Zap, Play, Pause, RotateCcw, Leaf, Mountain } from 'lucide-react';
import { cn } from '../lib/utils';
import { RouteCardSkeleton } from '../components/ui/Skeleton';
import { buildPosLookup } from '../lib/geo';
import { useEVSimulation } from '../hooks/useEVSimulation';
import { BatteryGauge } from '../components/map/BatteryGauge';
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
  const [sourceLat, setSourceLat] = useState(17.3616);
  const [sourceLon, setSourceLon] = useState(78.4747);
  const [destLat, setDestLat] = useState(17.4435);
  const [destLon, setDestLon] = useState(78.3772);
  const [sourceLabel, setSourceLabel] = useState('Charminar');
  const [destLabel, setDestLabel] = useState('HITEC City');
  const [loading, setLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState<number | undefined>(undefined);
  const [routeType, setRouteType] = useState<'fast' | 'eco' | 'scenic'>('fast');
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2 | 4>(1);
  const [elevationData, setElevationData] = useState<ElevationPoint[]>([]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { id: 'wp-start', label: 'Charminar', type: 'start', lat: 17.3616, lon: 78.4747 },
    { id: 'wp-end', label: 'HITEC City', type: 'end', lat: 17.4435, lon: 78.3772 },
  ]);

  const posLookup = useMemo(() => roadNetwork ? buildPosLookup(roadNetwork) : null, [roadNetwork]);

  const { state: simState, start: startSim, pause: pauseSim, resume: resumeSim, reset: resetSim } =
    useEVSimulation({
      route: selectedRoute,
      posLookup,
      startSOC: currentEVState.battery_soc,
      batteryCapacityKWh: currentEVState.battery_capacity_kwh,
      speedMultiplier,
    });

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
      });
      // Convert GeoJSON routes to legacy Route format
      const routes = [geoJSONRouteToLegacy(result.route), ...result.alternatives.map(geoJSONRouteToLegacy)];
      setGeneratedRoutes(routes);
      if (routes.length > 0) {
        setSelectedRoute(routes[0]);
        setHighlightIdx(0);
        // Extract elevation profile from response if available
        if (result.route?.properties?.elevation_profile) {
          setElevationData(result.route.properties.elevation_profile);
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

            {/* ── Simulation Controls ──────────────── */}
            {selectedRoute && (
              <div className="mt-4">
                <div className="divider mb-4" />
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-1.5 rounded-lg bg-amber-500/10"><Zap className="w-3.5 h-3.5 text-amber-500" /></div>
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Simulation</h3>
                </div>
                <BatteryGauge
                  soc={simState.currentSOC}
                  capacityKWh={currentEVState.battery_capacity_kwh}
                  isCharging={simState.isCharging}
                  isSimulating={simState.isSimulating}
                />
                <div className="flex gap-2 mt-3">
                  {!simState.isSimulating ? (
                    <Button variant="primary" fullWidth icon={Play} onClick={startSim}>Simulate</Button>
                  ) : simState.isPaused ? (
                    <Button variant="primary" fullWidth icon={Play} onClick={resumeSim}>Resume</Button>
                  ) : (
                    <Button variant="secondary" fullWidth icon={Pause} onClick={pauseSim}>Pause</Button>
                  )}
                  {simState.isSimulating && (
                    <Button variant="ghost" icon={RotateCcw} onClick={resetSim} />
                  )}
                </div>
                {/* Speed multiplier controls */}
                <div className="mt-3">
                  <p className="text-xs text-muted mb-1.5 uppercase tracking-wider">Speed</p>
                  <div className="flex gap-1.5">
                    {([1, 2, 4] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSpeedMultiplier(s)}
                        className={cn(
                          'flex-1 text-xs font-semibold py-1.5 rounded-lg border transition-colors',
                          speedMultiplier === s
                            ? 'bg-emerald/20 border-emerald text-emerald'
                            : 'bg-white/[0.04] border-white/10 text-muted hover:text-white hover:border-white/20',
                        )}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>
                </div>
                {simState.isSimulating && (
                  <div className="mt-3">
                    <ProgressBar value={simState.progress * 100} size="sm" variant={simState.isCharging ? 'warning' : 'primary'} />
                    <p className="text-xs text-muted mt-1.5 text-center">
                      {simState.isCharging ? 'Charging…' : `Segment ${simState.currentSegmentIndex + 1}/${(selectedRoute?.path?.length ?? 1) - 1}`}
                    </p>
                  </div>
                )}
              </div>
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
                percentage={Math.round(Math.random() * 20 + 20)}
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
