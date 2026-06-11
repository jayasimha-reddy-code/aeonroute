import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { hyperStaggerContainer, hyperStaggerItem } from '../lib/motion';
import { useSystemStore, useBatteryCapacity, useEVState, useRoutes } from '../store/store';
import { useSimulationStore } from '../store/simulationStore';
import { useRouteGeneration } from '../hooks/useRouteGeneration';

import NetworkMap from '../components/domain/NetworkMap';
import RouteCard from '../components/domain/RouteCard';
import PageHeader from '../components/layout/PageHeader';
import { Card, Button, EmptyState, Spinner, CardHeader } from '../components/ui';
import { ViewToggle } from '../components/ui/ViewToggle';
import { Map, MapPin, Navigation, Sparkles, Zap, Leaf, Mountain } from 'lucide-react';
import { cn } from '../lib/utils';
import { RouteCardSkeleton } from '../components/ui/Skeleton';

import { RouteTimeline } from '../components/domain/map/RouteTimeline';
import { WaypointList } from '../components/domain/route/WaypointList';
import { ElevationProfile } from '../components/domain/route/ElevationProfile';
import { CarbonSavedCard } from '../components/domain/route/CarbonSavedCard';
import { SegmentList } from '../components/domain/route/SegmentList';
import { SimulationController } from '../components/domain/route/SimulationController';

const LANDMARKS = [
  { label: 'Charminar', lat: 17.3616, lon: 78.4747 },
  { label: 'HITEC City', lat: 17.4435, lon: 78.3772 },
  { label: 'Secunderabad Stn', lat: 17.4344, lon: 78.5013 },
  { label: 'Gachibowli', lat: 17.4401, lon: 78.3489 },
  { label: 'Kukatpally', lat: 17.4849, lon: 78.3903 },
  { label: 'Begumpet', lat: 17.4437, lon: 78.4672 },
];

function RoutePlanner() {
  const { roadNetwork } = useSystemStore();
  const settingsBattery = useBatteryCapacity();
  const { currentEVState, setEVState } = useEVState();
  const { generatedRoutes, selectedRoute, setSelectedRoute } = useRoutes();
  const [searchParams] = useSearchParams();

  const {
    loading, highlightIdx, setHighlightIdx,
    routeType, setRouteType, elevationData,
    waypoints, setWaypoints,
    setDestLat, setDestLon, setDestLabel,
    handleGenerateRoutes, posLookup,
    setSourceLat, setSourceLon, setSourceLabel
  } = useRouteGeneration();

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
  }, [searchParams, setDestLat, setDestLon, setDestLabel, setWaypoints]);

  useEffect(() => {
    if (currentEVState.battery_capacity_kwh !== settingsBattery) {
      setEVState({ ...currentEVState, battery_capacity_kwh: settingsBattery });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsBattery]);

  const [speedMultiplier, setSpeedMultiplierLocal] = useState<1 | 2 | 4>(1);
  const simState = useSimulationStore();
  const setSpeedMultiplier = (s: 1 | 2 | 4) => {
    setSpeedMultiplierLocal(s);
    simState.setSpeedMultiplier(s);
  };

  const startSim = () => simState.startSimulation({
    route: selectedRoute!,
    posLookup,
    startSOC: currentEVState.battery_soc,
    batteryCapacityKWh: currentEVState.battery_capacity_kwh,
    speedMultiplier,
    routeMode: routeType,
  });

  const handleNodeClick = (nodeId: number) => {
    if (posLookup) {
      const coord = posLookup[nodeId.toString()];
      if (coord) {
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
  };

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
            <CardHeader icon={Navigation} title="Route Parameters" accent="emerald" />

            {/* Multi-Stop Waypoint List */}
            <WaypointList
              waypoints={waypoints}
              onChange={(updated) => {
                setWaypoints(updated);
                const start = updated[0];
                const end = updated[updated.length - 1];
                if (start.lat && start.lon) { setSourceLat(start.lat); setSourceLon(start.lon); setSourceLabel(start.label || ''); }
                if (end.lat && end.lon) { setDestLat(end.lat); setDestLon(end.lon); setDestLabel(end.label || ''); }
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
            <SimulationController 
              selectedRoute={selectedRoute} 
              onStartSim={startSim}
              speedMultiplier={speedMultiplier}
              setSpeedMultiplier={setSpeedMultiplier}
            />
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
                  { value: 'dijkstra' as const, label: 'Dijkstra', icon: Navigation },
                  { value: 'astar' as const, label: 'A*', icon: Navigation },
                  { value: 'gnn' as const, label: 'GNN', icon: Sparkles },
                  { value: 'hybrid' as const, label: 'Hybrid AI', icon: Sparkles },
                ]}
                value={routeType}
                onChange={setRouteType}
                size="sm"
              />
            </div>
            
            <div className="flex items-center gap-4 mb-3 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full inline-block" style={{ background: '#3b82f6' }} />Fast</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full inline-block" style={{ background: '#10b981' }} />Eco</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full inline-block" style={{ background: '#a855f7' }} />Scenic</span>
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
