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

  const posLookup = useMemo(() => roadNetwork ? buildPosLookup(roadNetwork) : null, [roadNetwork]);

  const { state: simState, start: startSim, pause: pauseSim, resume: resumeSim, reset: resetSim } =
    useEVSimulation({
      route: selectedRoute,
      posLookup,
      startSOC: currentEVState.battery_soc,
      batteryCapacityKWh: currentEVState.battery_capacity_kwh,
    });

  const handleGenerateRoutes = async () => {
    if (!roadNetwork) {
      addToast({ type: 'warning', title: 'No Network', message: 'Road network must be loaded first.' });
      return;
    }
    if (sourceLat === destLat && sourceLon === destLon) {
      addToast({ type: 'warning', title: 'Invalid Input', message: 'Source and destination must be different.' });
      return;
    }
    setLoading(true);
    setGeneratedRoutes([]);
    try {
      const result = await api.generateRoute({
        source_lat: sourceLat,
        source_lon: sourceLon,
        dest_lat: destLat,
        dest_lon: destLon,
        battery_soc: currentEVState.battery_soc,
        battery_capacity_kwh: currentEVState.battery_capacity_kwh,
      });
      // Convert GeoJSON routes to legacy Route format
      const routes = [geoJSONRouteToLegacy(result.route), ...result.alternatives.map(geoJSONRouteToLegacy)];
      setGeneratedRoutes(routes);
      if (routes.length > 0) {
        setSelectedRoute(routes[0]);
        setHighlightIdx(0);
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

            {/* Source */}
            <div className="mb-4">
              <label className="input-label flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald" /> Start Location
              </label>
              <select
                value={sourceLabel}
                onChange={(e) => {
                  const lm = LANDMARKS.find(l => l.label === e.target.value);
                  if (lm) { setSourceLat(lm.lat); setSourceLon(lm.lon); setSourceLabel(lm.label); }
                }}
                className="input-field"
              >
                {LANDMARKS.map(lm => (
                  <option key={lm.label} value={lm.label}>{lm.label}</option>
                ))}
              </select>
              <p className="text-[10px] text-muted mt-1 font-mono">{sourceLat.toFixed(4)}, {sourceLon.toFixed(4)}</p>
            </div>

            {/* Destination */}
            <div className="mb-4">
              <label className="input-label flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose" /> Destination
              </label>
              <select
                value={destLabel}
                onChange={(e) => {
                  const lm = LANDMARKS.find(l => l.label === e.target.value);
                  if (lm) { setDestLat(lm.lat); setDestLon(lm.lon); setDestLabel(lm.label); }
                }}
                className="input-field"
              >
                {LANDMARKS.map(lm => (
                  <option key={lm.label} value={lm.label}>{lm.label}</option>
                ))}
              </select>
              <p className="text-[10px] text-muted mt-1 font-mono">{destLat.toFixed(4)}, {destLon.toFixed(4)}</p>
            </div>

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
        </div>
      </motion.div>
    </motion.div>
  );
}

export default RoutePlanner;
