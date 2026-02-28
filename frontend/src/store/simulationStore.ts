/**
 * simulationStore — Global Simulation State (Zustand)
 * ====================================================
 * Owns the EV simulation rAF loop independently of React.
 * The SimulationEngine class controls requestAnimationFrame
 * and persists across page navigation.
 *
 * Usage:
 *   useSimulationStore.getState().startSimulation(...)
 *   useSimulationStore.getState().pauseSimulation()
 *   useSimulationStore.getState().resumeSimulation()
 *   useSimulationStore.getState().resetSimulation()
 */
import { create } from 'zustand';
import * as turf from '@turf/turf';
import type { Route } from '../services/api';
import { useSystemStore } from './store';

// ── Types ──────────────────────────────────────────────

export interface SimulationState {
    isSimulating: boolean;
    isPaused: boolean;
    isCharging: boolean;
    isBatteryLow: boolean;
    isBatteryDepleted: boolean;
    progress: number;
    currentPosition: [number, number] | null;
    currentBearing: number;
    currentSOC: number;
    currentSegmentIndex: number;
    currentNodeId: number;
    chargingProgress: number;
    chargingStationName: string;
    speedMultiplier: number;
}

interface SimulationActions {
    startSimulation: (opts: StartSimulationOpts) => void;
    pauseSimulation: () => void;
    resumeSimulation: () => void;
    resetSimulation: () => void;
    setSpeedMultiplier: (speed: number) => void;
    _setState: (patch: Partial<SimulationState>) => void;
}

export interface StartSimulationOpts {
    route: Route;
    posLookup: Record<string, [number, number]> | null;
    startSOC: number;
    batteryCapacityKWh: number;
    speedMultiplier?: number;
    routeMode?: 'fast' | 'eco' | 'scenic';
}

// ── Constants ─────────────────────────────────────────

const MODE_DRAIN_MULTIPLIERS: Record<string, number> = {
    fast: 1.2,
    eco: 0.85,
    scenic: 1.0,
};
const BATTERY_LOW_THRESHOLD = 15;
const BASE_MS_PER_KM = 4000;
const CHARGE_DURATION_MS = 2500;
const CHARGE_AMOUNT = 30;
const CHARGING_PROXIMITY_KM = 0.05;

const INITIAL_STATE: SimulationState = {
    isSimulating: false,
    isPaused: false,
    isCharging: false,
    isBatteryLow: false,
    isBatteryDepleted: false,
    progress: 0,
    currentPosition: null,
    currentBearing: 0,
    currentSOC: 100,
    currentSegmentIndex: 0,
    currentNodeId: 0,
    chargingProgress: 0,
    chargingStationName: '',
    speedMultiplier: 1,
};

// ── SimulationEngine — owns the rAF loop ──────────────

interface RouteCache {
    lineString: GeoJSON.Feature<GeoJSON.LineString>;
    totalLengthKm: number;
    chargingStopCoords: { coord: [number, number]; nodeId: number; name: string }[];
    path: number[];
    totalEnergyKwh: number;
}

interface InternalRefs {
    startTime: number;
    pausedAt: number;
    totalPausedMs: number;
    chargingStartTime: number;
    chargingNodesPassed: Set<string>;
    socAtChargeStart: number;
}

class SimulationEngine {
    private rafId = 0;
    private routeCache: RouteCache | null = null;
    private refs: InternalRefs = {
        startTime: 0,
        pausedAt: 0,
        totalPausedMs: 0,
        chargingStartTime: 0,
        chargingNodesPassed: new Set(),
        socAtChargeStart: 0,
    };
    private opts: StartSimulationOpts | null = null;

    // ── Load route data ─────────────────────────────────

    loadRoute(opts: StartSimulationOpts): boolean {
        this.opts = opts;
        const { route, posLookup } = opts;

        let coordinates: [number, number][] = [];
        const geojsonCoords = route.geojson?.geometry?.coordinates;

        if (geojsonCoords && geojsonCoords.length >= 2) {
            coordinates = geojsonCoords as [number, number][];
        } else if (posLookup) {
            for (const nodeId of route.path) {
                const c = posLookup[nodeId.toString()];
                if (c) coordinates.push(c);
            }
        }

        if (coordinates.length < 2) {
            this.routeCache = null;
            return false;
        }

        const lineString = turf.lineString(coordinates);
        const totalLengthKm = turf.length(lineString, { units: 'kilometers' });

        const chargingStopCoords: { coord: [number, number]; nodeId: number; name: string }[] = [];
        for (const stop of route.charging_stop_details ?? []) {
            chargingStopCoords.push({
                coord: [stop.lon, stop.lat],
                nodeId: stop.node_id,
                name: stop.name ?? 'Charging Station',
            });
        }

        this.routeCache = {
            lineString,
            totalLengthKm,
            chargingStopCoords,
            path: route.path,
            totalEnergyKwh: route.energy_kwh,
        };
        return true;
    }

    // ── Start ───────────────────────────────────────────

    start(): void {
        if (!this.routeCache || !this.opts) return;
        const now = performance.now();
        this.refs = {
            startTime: now,
            pausedAt: 0,
            totalPausedMs: 0,
            chargingStartTime: 0,
            chargingNodesPassed: new Set(),
            socAtChargeStart: 0,
        };
        const firstCoord = this.routeCache.lineString.geometry.coordinates[0] as [number, number];
        useSimulationStore.setState({
            ...INITIAL_STATE,
            isSimulating: true,
            currentSOC: this.opts.startSOC,
            currentPosition: firstCoord,
            currentNodeId: this.routeCache.path[0] ?? 0,
            speedMultiplier: this.opts.speedMultiplier ?? 1,
        });
        this.rafId = requestAnimationFrame((t) => this.tick(t));
    }

    // ── Pause / Resume ──────────────────────────────────

    pause(): void {
        this.refs.pausedAt = performance.now();
        cancelAnimationFrame(this.rafId);
        useSimulationStore.setState({ isPaused: true });
    }

    resume(): void {
        const refs = this.refs;
        if (refs.pausedAt > 0) {
            refs.totalPausedMs += performance.now() - refs.pausedAt;
            refs.pausedAt = 0;
        }
        useSimulationStore.setState({ isPaused: false });
        this.rafId = requestAnimationFrame((t) => this.tick(t));
    }

    // ── Reset ───────────────────────────────────────────

    reset(): void {
        cancelAnimationFrame(this.rafId);
        this.refs.chargingNodesPassed = new Set();
        this.routeCache = null;
        this.opts = null;
        useSimulationStore.setState({ ...INITIAL_STATE });
    }

    // ── Tick ────────────────────────────────────────────

    private tick(now: number): void {
        const rd = this.routeCache;
        const opts = this.opts;
        if (!rd || !opts) return;

        const prev = useSimulationStore.getState();
        if (!prev.isSimulating || prev.isPaused) return;

        const refs = this.refs;
        const drainMultiplier = MODE_DRAIN_MULTIPLIERS[opts.routeMode ?? 'fast'] ?? 1.0;

        // ── Charging logic ──────────────────────────────
        if (prev.isCharging) {
            const chargeElapsed = now - refs.chargingStartTime;
            const chargeProgress = Math.min(chargeElapsed / CHARGE_DURATION_MS, 1);
            const newSOC = Math.min(95, refs.socAtChargeStart + CHARGE_AMOUNT * chargeProgress);

            if (chargeProgress >= 1) {
                refs.totalPausedMs += CHARGE_DURATION_MS;
                useSimulationStore.setState({ isCharging: false, chargingProgress: 0, currentSOC: newSOC, chargingStationName: '' });
            } else {
                useSimulationStore.setState({ chargingProgress: chargeProgress, currentSOC: newSOC });
            }
            this.rafId = requestAnimationFrame((t) => this.tick(t));
            return;
        }

        // ── Movement logic ──────────────────────────────
        const elapsed = now - refs.startTime - refs.totalPausedMs;
        const speedMultiplier = prev.speedMultiplier;
        const totalDurationMs = rd.totalLengthKm * BASE_MS_PER_KM / speedMultiplier;
        const progress = Math.min(elapsed / totalDurationMs, 1);

        const distanceTraveled = progress * rd.totalLengthKm;
        const pointFeature = turf.along(rd.lineString, distanceTraveled, { units: 'kilometers' });
        const [lng, lat] = pointFeature.geometry.coordinates;

        const lookAhead = Math.min(distanceTraveled + 0.05, rd.totalLengthKm);
        const aheadPoint = turf.along(rd.lineString, lookAhead, { units: 'kilometers' });
        const bearing = turf.bearing(pointFeature, aheadPoint);

        // SOC drain — linear approximation (Wave 3 upgrades to per-segment)
        const energyUsed = rd.totalEnergyKwh * progress * drainMultiplier;
        const socDrain = (energyUsed / opts.batteryCapacityKWh) * 100;
        const currentSOC = Math.max(0, opts.startSOC - socDrain);
        const isBatteryLow = currentSOC < BATTERY_LOW_THRESHOLD && currentSOC > 0;
        const isBatteryDepleted = currentSOC <= 0;

        const totalNodes = rd.path.length;
        const segIdx = Math.min(Math.floor(progress * (totalNodes - 1)), totalNodes - 2);
        const currentNodeId = rd.path[segIdx] ?? 0;

        // ── Battery depleted → stop ─────────────────────
        if (isBatteryDepleted) {
            useSimulationStore.setState({
                isSimulating: false,
                progress,
                currentPosition: [lng, lat] as [number, number],
                currentBearing: bearing,
                currentSOC: 0,
                isBatteryLow: false,
                isBatteryDepleted: true,
                currentSegmentIndex: segIdx,
                currentNodeId,
            });
            useSystemStore.getState().addToast({
                type: 'error',
                title: '🔋 Battery Depleted',
                message: `EV ran out of charge at segment ${segIdx + 1}. Route requires a charging stop.`,
                duration: 8000,
            });
            useSystemStore.getState().addActivity('system', `Simulation stopped — battery depleted at segment ${segIdx + 1}`);
            return; // do NOT schedule next rAF
        }

        // ── Charging station proximity check ────────────
        for (const station of rd.chargingStopCoords) {
            const key = `${station.nodeId}`;
            if (refs.chargingNodesPassed.has(key)) continue;
            const stationPoint = turf.point(station.coord);
            const dist = turf.distance(pointFeature, stationPoint, { units: 'kilometers' });
            if (dist < CHARGING_PROXIMITY_KM) {
                refs.chargingNodesPassed.add(key);
                refs.chargingStartTime = now;
                refs.socAtChargeStart = currentSOC;
                useSimulationStore.setState({
                    isCharging: true,
                    chargingProgress: 0,
                    chargingStationName: station.name,
                    progress,
                    currentPosition: [lng, lat] as [number, number],
                    currentBearing: bearing,
                    currentSOC,
                    currentSegmentIndex: segIdx,
                    currentNodeId,
                });
                this.rafId = requestAnimationFrame((t) => this.tick(t));
                return;
            }
        }

        // ── Completed ───────────────────────────────────
        if (progress >= 1) {
            const lastCoord = rd.lineString.geometry.coordinates[rd.lineString.geometry.coordinates.length - 1] as [number, number];
            useSimulationStore.setState({
                isSimulating: false,
                progress: 1,
                currentPosition: lastCoord,
                currentBearing: bearing,
                currentSOC,
                isBatteryLow: false,
                isBatteryDepleted: false,
                currentSegmentIndex: totalNodes - 2,
                currentNodeId: rd.path[rd.path.length - 1] ?? 0,
            });
            useSystemStore.getState().addActivity('route', 'EV simulation completed successfully');
            return;
        }

        // ── Normal movement ─────────────────────────────
        useSimulationStore.setState({
            progress,
            currentPosition: [lng, lat] as [number, number],
            currentBearing: bearing,
            currentSOC,
            isBatteryLow,
            isBatteryDepleted: false,
            currentSegmentIndex: segIdx,
            currentNodeId,
        });

        this.rafId = requestAnimationFrame((t) => this.tick(t));
    }
}

// ── Singleton engine ───────────────────────────────────
export const simulationEngine = new SimulationEngine();

// ── Zustand store ──────────────────────────────────────
export const useSimulationStore = create<SimulationState & SimulationActions>((set) => ({
    ...INITIAL_STATE,

    startSimulation: (opts) => {
        const loaded = simulationEngine.loadRoute(opts);
        if (!loaded) {
            useSystemStore.getState().addToast({
                type: 'error',
                title: 'Simulation Error',
                message: 'Route has no valid coordinates.',
            });
            return;
        }
        simulationEngine.start();
    },

    pauseSimulation: () => {
        simulationEngine.pause();
    },

    resumeSimulation: () => {
        simulationEngine.resume();
    },

    resetSimulation: () => {
        simulationEngine.reset();
    },

    setSpeedMultiplier: (speed) => {
        set({ speedMultiplier: speed });
    },

    _setState: (patch) => set(patch),
}));

// ── Selector hooks ─────────────────────────────────────

export const useIsSimulating = () => useSimulationStore((s) => s.isSimulating);
export const useSimulationProgress = () => useSimulationStore((s) => s.progress);
export const useSimulationSOC = () => useSimulationStore((s) => s.currentSOC);
export const useSimulationPosition = () => useSimulationStore((s) => s.currentPosition);
export const useSimulationBearing = () => useSimulationStore((s) => s.currentBearing);
export const useIsBatteryDepleted = () => useSimulationStore((s) => s.isBatteryDepleted);
export const useIsCharging = () => useSimulationStore((s) => s.isCharging);
export const useChargingProgress = () => useSimulationStore((s) => s.chargingProgress);
export const useCurrentSegmentIndex = () => useSimulationStore((s) => s.currentSegmentIndex);
export const useCurrentNodeId = () => useSimulationStore((s) => s.currentNodeId);
