import { useRef, useState, useCallback, useEffect } from 'react';
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
  chargingNodesPassed: Set<number>;
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

const MS_PER_SEGMENT = 3000;
const CHARGE_DURATION_MS = 2500;
const CHARGE_AMOUNT = 30;

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

  // Pre-compute route coordinates and cumulative distances
  const routeData = useRef<{
    coords: [number, number][];
    cumDist: number[];
    totalDist: number;
    chargingStops: Set<number>;
    path: number[];
  } | null>(null);

  useEffect(() => {
    if (!route || !posLookup) {
      routeData.current = null;
      return;
    }
    const coords: [number, number][] = [];
    const path = route.path;
    for (const nodeId of path) {
      const c = posLookup[nodeId.toString()];
      if (c) coords.push(c);
    }
    if (coords.length < 2) {
      routeData.current = null;
      return;
    }
    // Cumulative distances
    const cumDist: number[] = [0];
    let total = 0;
    for (let i = 1; i < coords.length; i++) {
      const dx = coords[i][0] - coords[i - 1][0];
      const dy = coords[i][1] - coords[i - 1][1];
      total += Math.sqrt(dx * dx + dy * dy);
      cumDist.push(total);
    }
    routeData.current = {
      coords,
      cumDist,
      totalDist: total,
      chargingStops: new Set(route.charging_stops ?? []),
      path,
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
          // Done charging, resume movement
          // Add pause offset for charging duration
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

      // ── Movement logic ──
      const elapsed = now - int.startTime - int.totalPausedMs;
      const totalDurationMs = (rd.coords.length - 1) * MS_PER_SEGMENT / speedMultiplier;
      const progress = Math.min(elapsed / totalDurationMs, 1);

      // Map progress to distance along route
      const distAlong = progress * rd.totalDist;

      // Find current segment
      let segIdx = 0;
      for (let i = 1; i < rd.cumDist.length; i++) {
        if (rd.cumDist[i] >= distAlong) {
          segIdx = i - 1;
          break;
        }
        segIdx = i - 1;
      }

      // Fractional position within segment
      const segStart = rd.cumDist[segIdx];
      const segEnd = rd.cumDist[segIdx + 1] ?? rd.cumDist[segIdx];
      const segLen = segEnd - segStart;
      const frac = segLen > 0 ? (distAlong - segStart) / segLen : 0;

      // Interpolate position
      const from = rd.coords[segIdx];
      const to = rd.coords[segIdx + 1] ?? rd.coords[segIdx];
      const lng = from[0] + (to[0] - from[0]) * frac;
      const lat = from[1] + (to[1] - from[1]) * frac;

      // Compute bearing
      const bearing = Math.atan2(to[0] - from[0], to[1] - from[1]) * (180 / Math.PI);

      // SOC depletion proportional to progress
      const energyUsed = (route?.energy_kwh ?? 0) * progress;
      const socDrain = (energyUsed / batteryCapacityKWh) * 100;
      const currentSOC = Math.max(0, startSOC - socDrain);

      // Current node
      const currentNodeId = rd.path[segIdx] ?? 0;

      // Check charging stop arrival (entering a new segment whose target is a charging stop)
      const nextNodeId = rd.path[segIdx + 1];
      if (
        nextNodeId !== undefined &&
        rd.chargingStops.has(nextNodeId) &&
        !int.chargingNodesPassed.has(nextNodeId) &&
        frac > 0.95
      ) {
        int.chargingNodesPassed.add(nextNodeId);
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

      // Completed
      if (progress >= 1) {
        const lastCoord = rd.coords[rd.coords.length - 1];
        return {
          ...prev,
          isSimulating: false,
          progress: 1,
          currentPosition: lastCoord,
          currentBearing: bearing,
          currentSOC,
          currentSegmentIndex: rd.coords.length - 2,
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

    // Schedule next frame (check if still simulating)
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
    setState({
      ...INITIAL_STATE,
      isSimulating: true,
      currentSOC: startSOC,
      currentPosition: routeData.current.coords[0],
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
