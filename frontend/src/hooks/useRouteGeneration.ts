import { useState, useRef, useMemo, useEffect } from 'react';
import api, { geoJSONRouteToLegacy } from '../services/api';
import { useSystemStore, useAddActivity, useEnergyWeight, useVehicleProfile, useEVState, useRoutes, useRoadNetwork } from '../store/store';
import { ElevationPoint } from '../components/domain/route/ElevationProfile';
import { Waypoint } from '../components/domain/route/WaypointList';
import { buildPosLookup } from '../lib/geo';

export function useRouteGeneration() {
  const { addToast } = useSystemStore();
  const roadNetwork = useRoadNetwork();
  const addActivity = useAddActivity();
  const energyWeight = useEnergyWeight();
  const vehicleProfile = useVehicleProfile();
  const { currentEVState } = useEVState();
  const { setGeneratedRoutes, setSelectedRoute } = useRoutes();

  const [loading, setLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState<number | undefined>(undefined);
  const [routeType, setRouteType] = useState<'fast' | 'eco' | 'scenic' | 'dijkstra' | 'astar' | 'q_learning' | 'dqn' | 'gnn' | 'hybrid'>('fast');
  const [elevationData, setElevationData] = useState<ElevationPoint[]>([]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { id: 'wp-start', label: 'Charminar', type: 'start', lat: 17.3616, lon: 78.4747 },
    { id: 'wp-end', label: 'HITEC City', type: 'end', lat: 17.4435, lon: 78.3772 },
  ]);
  const [sourceLabel, setSourceLabel] = useState('Charminar');
  const [destLabel, setDestLabel] = useState('HITEC City');
  const [sourceLat, setSourceLat] = useState(17.3616);
  const [sourceLon, setSourceLon] = useState(78.4747);
  const [destLat, setDestLat] = useState(17.4435);
  const [destLon, setDestLon] = useState(78.3772);

  const posLookup = useMemo(() => roadNetwork ? buildPosLookup(roadNetwork) : null, [roadNetwork]);

  const handleGenerateRoutes = async () => {
    if (!roadNetwork) {
      addToast({ type: 'warning', title: 'No Network', message: 'Road network must be loaded first.' });
      return;
    }
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
      
      const routes = [geoJSONRouteToLegacy(result.route), ...result.alternatives.map(geoJSONRouteToLegacy)];
      setGeneratedRoutes(routes);
      
      if (routes.length > 0) {
        setSelectedRoute(routes[0]);
        setHighlightIdx(0);
        
        if (result.route?.properties?.elevation_profile) {
          setElevationData(result.route.properties.elevation_profile.map((pt: any) => ({
            distance_km: pt.distance_km,
            elevation: pt.elevation_m ?? pt.elevation ?? 500,
          })));
        } else {
          const numPoints = 30;
          const totalDist = result.route?.properties?.distance_km ?? 10;
          const simElev: ElevationPoint[] = Array.from({ length: numPoints }, (_, i) => {
            const d = (i / (numPoints - 1)) * totalDist;
            const e = 500 + Math.sin(i * 0.4) * 40 + Math.sin(i * 0.15) * 80 + Math.random() * 15;
            return { distance_km: +d.toFixed(2), elevation: +e.toFixed(1) };
          });
          setElevationData(simElev);
        }
        
        addToast({ 
          type: 'success', 
          title: 'Routes Generated', 
          message: (() => {
            const rt = result.route.properties.route_type ?? '';
            const ai = result.route.properties.ai_confidence;
            if (rt.startsWith('hybrid')) return `Hybrid AI: ${result.alternatives.length + 1} candidates ranked (${ai ? ai.toFixed(0) + '% confidence' : 'heuristic scoring'})`;
            if (rt === 'gnn') return `GNN route${ai ? ` (${ai.toFixed(0)}% confidence)` : ''} — ${routes.length} route${routes.length > 1 ? 's' : ''}`;
            if (rt === 'dqn') return `DQN route generated — ${routes.length} route${routes.length > 1 ? 's' : ''}`;
            if (rt === 'astar') return `A* route: ${routes.length} route${routes.length > 1 ? 's' : ''}`;
            return `Found ${routes.length} route${routes.length > 1 ? 's' : ''} (${rt === 'q_learning' ? 'Q-Learning Optimized' : rt === 'dijkstra' ? 'Dijkstra' : rt}).`;
          })()
        });
        
        const startLabelName = startWp?.label ?? 'Origin';
        const endLabelName = endWp?.label ?? 'Destination';
        addActivity('route', `Route generated: ${startLabelName} → ${endLabelName} (${result.route.properties.distance_km?.toFixed(1) ?? '?'} km)`);
        
        const injectedDetails = result.route.properties.charging_stop_details ?? [];
        const injectedStops = injectedDetails.filter((s: any) => s.injected);
        if (injectedStops.length > 0) {
          for (const stop of injectedStops) {
            addActivity('route', `Charging stop auto-injected at ${stop.name}`);
          }
        }
      }
    } catch (error: any) {
      addToast({ type: 'error', title: 'Route Generation Failed', message: error?.message });
    } finally {
      setLoading(false);
    }
  };

  // Debounced auto-regen
  const autoRegenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!roadNetwork) return;
    const startWp = waypoints[0];
    const endWp = waypoints[waypoints.length - 1];
    const sLat = startWp.lat ?? sourceLat;
    const sLon = startWp.lon ?? sourceLon;
    const dLat = endWp.lat ?? destLat;
    const dLon = endWp.lon ?? destLon;
    
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

  return {
    loading,
    highlightIdx,
    setHighlightIdx,
    routeType,
    setRouteType: setRouteType as (v: any) => void,
    elevationData,
    waypoints,
    setWaypoints,
    sourceLat, setSourceLat,
    sourceLon, setSourceLon,
    destLat, setDestLat,
    destLon, setDestLon,
    sourceLabel, setSourceLabel,
    destLabel, setDestLabel,
    handleGenerateRoutes,
    posLookup
  };
}
