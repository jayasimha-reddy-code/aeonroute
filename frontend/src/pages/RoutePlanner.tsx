import { useState, useCallback, useMemo } from 'react';
import { useSystemStore } from '../store/store';
import api from '../services/api';
import NetworkMap from '../components/NetworkMap';
import RouteCard from '../components/RouteCard';
import PageHeader from '../components/PageHeader';
import { Card, Button, EmptyState, Spinner, ProgressBar } from '../components/ui';
import { Map, MapPin, Navigation, Sparkles, Zap, Globe, Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { RouteCardSkeleton } from '../components/ui/Skeleton';
import { buildPosLookup } from '../lib/geo';
import { useEVSimulation } from '../hooks/useEVSimulation';
import { BatteryGauge } from '../components/map/BatteryGauge';
import { RouteTimeline } from '../components/map/RouteTimeline';

function RoutePlanner() {
  const { roadNetwork, generatedRoutes, setGeneratedRoutes, selectedRoute, setSelectedRoute, currentEVState, setEVState, addToast } = useSystemStore();
  const [source, setSource] = useState(0);
  const [destination, setDestination] = useState(10);
  const [loading, setLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState<number | undefined>(undefined);

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
    if (source === destination) {
      addToast({ type: 'warning', title: 'Invalid Input', message: 'Source and destination must be different.' });
      return;
    }
    setLoading(true);
    setGeneratedRoutes([]);
    try {
      const result = await api.generateRoute({ source, destination, ev_state: currentEVState, num_candidates: 5 });
      setGeneratedRoutes(result.routes);
      if (result.routes.length > 0) {
        setSelectedRoute(result.routes[0]);
        setHighlightIdx(0);
        addToast({ type: 'success', title: 'Routes Generated', message: `Found ${result.routes.length} candidate routes.` });
      }
    } catch (error: any) {
      addToast({ type: 'error', title: 'Route Generation Failed', message: error?.message });
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = useCallback((nodeId: number) => {
    if (!source && source !== 0) { setSource(nodeId); return; }
    setDestination(nodeId);
  }, [source]);

  const batteryColor = currentEVState.battery_soc > 50 ? 'bg-emerald' : currentEVState.battery_soc > 20 ? 'bg-amber' : 'bg-rose';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <PageHeader title="Route Planner" subtitle="Generate and compare optimized EV routes with real-time metrics" icon={Map} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
                <span className="w-2 h-2 rounded-full bg-emerald" /> Start Node
              </label>
              <input type="number" min={0} max={(roadNetwork?.nodes ?? 100) - 1} value={source} onChange={(e) => setSource(parseInt(e.target.value) || 0)} className="input-field" />
            </div>

            {/* Destination */}
            <div className="mb-4">
              <label className="input-label flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose" /> Destination Node
              </label>
              <input type="number" min={0} max={(roadNetwork?.nodes ?? 100) - 1} value={destination} onChange={(e) => setDestination(parseInt(e.target.value) || 0)} className="input-field" />
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
          <Card className="!p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald/10"><Globe className="w-4 h-4 text-emerald" /></div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Route Visualization</h3>
                  <p className="text-[11px] text-muted">Click nodes on the map to set waypoints</p>
                </div>
              </div>
              {generatedRoutes.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted">
                  {generatedRoutes.slice(0, 3).map((_, idx) => (
                    <button key={idx} onClick={() => { setHighlightIdx(idx); setSelectedRoute(generatedRoutes[idx]); }}
                      className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all', highlightIdx === idx ? 'bg-surface-raised font-medium text-white shadow-sm' : 'hover:bg-surface-hover')}>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#10b981', '#6366f1', '#f59e0b'][idx] }} />
                      Route {idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="h-[420px]">
              {loading && !generatedRoutes.length ? (
                <div className="h-full flex items-center justify-center bg-midnight/50">
                  <Spinner size="lg" label="Generating routes…" />
                </div>
              ) : roadNetwork ? (
                <NetworkMap
                  network={roadNetwork}
                  routes={generatedRoutes}
                  highlightIndex={highlightIdx}
                  sourceNode={source}
                  destNode={destination}
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
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Generated Routes
              {generatedRoutes.length > 0 && <span className="ml-2 text-muted font-normal normal-case">({generatedRoutes.length})</span>}
            </h3>

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
      </div>
    </div>
  );
}

export default RoutePlanner;
