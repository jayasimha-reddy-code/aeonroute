import { useRef, useState, useCallback, useEffect } from 'react';
import * as turf from '@turf/turf';
import type { Route } from '../services/api';

// ─── Types ────────────────────────────────────────────────

export interface UseEVSimulationOptions {
  route: Route | null;
  posLookup: Record<string, [number, number]> | null;
  startSOC: number;
  batteryCapacityKWh: number;
  speedMultiplier?: number;
}

export interface SimulationState {
  isSimulating: boolean;
  isPaused: boolean;
  isCharging: boolean;
  progress: number;
  currentPosition: [number, number] | null;
  currentBearing: number;
  currentSOC: number;
  currentSegmentIndex: number;
  currentNodeId: number;
  chargingProgress: number;
}

interface InternalState {
  startTime: number;
  pausedAt: number;
  totalPausedMs: number;
  chargingStartTime: number;
  chargingNodesPassed: Set<string>;
  socAtChargeStart: number;
}

const INITIAL_STATE: SimulationState = {
  isSimulating: false,
  isPaused: false,
  isCharging: false,
  progress: 0,
  currentPosition: null,
  currentBearing: 0,
  currentSOC: 100,
  currentSegmentIndex: 0,
  currentNodeId: 0,
  chargingProgress: 0,
};

const BASE_MS_PER_KM = 4000; // animation base duration per km — 15km route = ~60s at 1×
const CHARGE_DURATION_MS = 2500;
const CHARGE_AMOUNT = 30;
const CHARGING_PROXIMITY_KM = 0.05; // 50 m

// ─── Hook ─────────────────────────────────────────────────

export function useEVSimulation(options: UseEVSimulationOptions) {
  const { route, posLookup, startSOC, batteryCapacityKWh, speedMultiplier = 1 } = options;

  const [state, setState] = useState<SimulationState>({ ...INITIAL_STATE, currentSOC: startSOC });

  const rafId = useRef<number>(0);
  const internals = useRef<InternalState>({
    startTime: 0,
    pausedAt: 0,
    totalPausedMs: 0,
    chargingStartTime: 0,
    chargingNodesPassed: new Set(),
    socAtChargeStart: 0,
  });

  // Pre-compute route GeoJSON LineString and total length using Turf.js
  const routeData = useRef<{
    lineString: GeoJSON.Feature<GeoJSON.LineString>;
    totalLengthKm: number;
    chargingStopCoords: { coord: [number, number]; nodeId: number }[];
    path: number[];
    totalEnergyKwh: number;
  } | null>(null);

  useEffect(() => {
    if (!route) {
      routeData.current = null;
      return;
    }

    // Build the GeoJSON LineString — prefer backend geometry over posLookup
    let coordinates: [number, number][] = [];
    const geojsonCoords = route.geojson?.geometry?.coordinates;

    if (geojsonCoords && geojsonCoords.length >= 2) {
      coordinates = geojsonCoords as [number, number][];
    } else if (posLookup) {
      // Fallback to node-based coords
      for (const nodeId of route.path) {
        const c = posLookup[nodeId.toString()];
        if (c) coordinates.push(c);
      }
    }

    if (coordinates.length < 2) {
      routeData.current = null;
      return;
    }

    const lineString = turf.lineString(coordinates);
    const totalLengthKm = turf.length(lineString, { units: 'kilometers' });

    // Build charging stop coords from station details
    const chargingStopCoords: { coord: [number, number]; nodeId: number }[] = [];
    const chargingDetails = route.charging_stop_details ?? [];
    for (const stop of chargingDetails) {
      chargingStopCoords.push({
        coord: [stop.lon, stop.lat],
        nodeId: stop.node_id,
      });
    }

    routeData.current = {
      lineString,
      totalLengthKm,
      chargingStopCoords,
      path: route.path,
      totalEnergyKwh: route.energy_kwh,
    };
  }, [route, posLookup]);

  // Reset when route changes
  useEffect(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    setState({ ...INITIAL_STATE, currentSOC: startSOC });
    internals.current.chargingNodesPassed = new Set();
  }, [route, startSOC]);

  const tick = useCallback((now: number) => {
    const rd = routeData.current;
    if (!rd) return;
    const int = internals.current;

    setState((prev) => {
      if (!prev.isSimulating || prev.isPaused) return prev;

      // ── Charging logic ──
      if (prev.isCharging) {
        const chargeElapsed = now - int.chargingStartTime;
        const chargeProgress = Math.min(chargeElapsed / CHARGE_DURATION_MS, 1);
        const newSOC = Math.min(95, int.socAtChargeStart + CHARGE_AMOUNT * chargeProgress);

        if (chargeProgress >= 1) {
          int.totalPausedMs += CHARGE_DURATION_MS;
          return {
            ...prev,
            isCharging: false,
            chargingProgress: 0,
            currentSOC: newSOC,
          };
        }
        return {
          ...prev,
          chargingProgress: chargeProgress,
          currentSOC: newSOC,
        };
      }

      // ── Movement logic using Turf.js ──
      const elapsed = now - int.startTime - int.totalPausedMs;
      const totalDurationMs = rd.totalLengthKm * BASE_MS_PER_KM / speedMultiplier;
      const progress = Math.min(elapsed / totalDurationMs, 1);

      // Distance traveled along the route
      const distanceTraveled = progress * rd.totalLengthKm;

      // Get current position using turf.along() for smooth on-path interpolation
      const pointFeature = turf.along(rd.lineString, distanceTraveled, { units: 'kilometers' });
      const [lng, lat] = pointFeature.geometry.coordinates;

      // Compute bearing from a point slightly behind to current
      let bearing = 0;
      const lookAhead = Math.min(distanceTraveled + 0.05, rd.totalLengthKm);
      const aheadPoint = turf.along(rd.lineString, lookAhead, { units: 'kilometers' });
      bearing = turf.bearing(pointFeature, aheadPoint);

      // SOC depletion proportional to distance traveled
      const energyUsed = (rd.totalEnergyKwh) * progress;
      const socDrain = (energyUsed / batteryCapacityKWh) * 100;
      const currentSOC = Math.max(0, startSOC - socDrain);

      // Approximate current segment index for UI display
      const totalNodes = rd.path.length;
      const segIdx = Math.min(Math.floor(progress * (totalNodes - 1)), totalNodes - 2);
      const currentNodeId = rd.path[segIdx] ?? 0;

      // Check proximity to charging stations (within 50m)
      for (const station of rd.chargingStopCoords) {
        const key = `${station.nodeId}`;
        if (int.chargingNodesPassed.has(key)) continue;
        const stationPoint = turf.point(station.coord);
        const dist = turf.distance(pointFeature, stationPoint, { units: 'kilometers' });
        if (dist < CHARGING_PROXIMITY_KM) {
          int.chargingNodesPassed.add(key);
          int.chargingStartTime = now;
          int.socAtChargeStart = currentSOC;
          return {
            ...prev,
            isCharging: true,
            chargingProgress: 0,
            progress,
            currentPosition: [lng, lat],
            currentBearing: bearing,
            currentSOC,
            currentSegmentIndex: segIdx,
            currentNodeId,
          };
        }
      }

      // Completed
      if (progress >= 1) {
        const lastCoord = rd.lineString.geometry.coordinates[rd.lineString.geometry.coordinates.length - 1];
        return {
          ...prev,
          isSimulating: false,
          progress: 1,
          currentPosition: lastCoord as [number, number],
          currentBearing: bearing,
          currentSOC,
          currentSegmentIndex: totalNodes - 2,
          currentNodeId: rd.path[rd.path.length - 1] ?? 0,
        };
      }

      return {
        ...prev,
        progress,
        currentPosition: [lng, lat],
        currentBearing: bearing,
        currentSOC,
        currentSegmentIndex: segIdx,
        currentNodeId,
      };
    });

    // Schedule next frame
    rafId.current = requestAnimationFrame(tick);
  }, [route, startSOC, batteryCapacityKWh, speedMultiplier]);

  const start = useCallback(() => {
    if (!routeData.current) return;
    const now = performance.now();
    internals.current = {
      startTime: now,
      pausedAt: 0,
      totalPausedMs: 0,
      chargingStartTime: 0,
      chargingNodesPassed: new Set(),
      socAtChargeStart: 0,
    };
    const firstCoord = routeData.current.lineString.geometry.coordinates[0];
    setState({
      ...INITIAL_STATE,
      isSimulating: true,
      currentSOC: startSOC,
      currentPosition: firstCoord as [number, number],
      currentNodeId: routeData.current.path[0] ?? 0,
    });
    rafId.current = requestAnimationFrame(tick);
  }, [tick, startSOC]);

  const pause = useCallback(() => {
    internals.current.pausedAt = performance.now();
    if (rafId.current) cancelAnimationFrame(rafId.current);
    setState((prev) => ({ ...prev, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    const int = internals.current;
    if (int.pausedAt > 0) {
      int.totalPausedMs += performance.now() - int.pausedAt;
      int.pausedAt = 0;
    }
    setState((prev) => ({ ...prev, isPaused: false }));
    rafId.current = requestAnimationFrame(tick);
  }, [tick]);

  const reset = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    internals.current.chargingNodesPassed = new Set();
    setState({ ...INITIAL_STATE, currentSOC: startSOC });
  }, [startSOC]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return { state, start, pause, resume, reset };
}
