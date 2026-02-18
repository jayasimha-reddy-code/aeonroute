/**
 * Zustand Store Unit Tests
 * ========================
 * Verifies core store actions work correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSystemStore } from '../store/store';

// Reset store state before each test
beforeEach(() => {
    useSystemStore.setState({
        activeTab: 'dashboard',
        toasts: [],
        roadNetwork: null,
        generatedRoutes: [],
        selectedRoute: null,
        isLoading: false,
        globalError: null,
        currentEVState: {
            battery_soc: 80,
            current_node: 0,
            battery_capacity_kwh: 60,
        },
    });
});

describe('Navigation', () => {
    it('should set active tab', () => {
        const store = useSystemStore.getState();
        store.setActiveTab('training');

        const state = useSystemStore.getState();
        expect(state.activeTab).toBe('training');
    });

    it('should default to dashboard tab', () => {
        expect(useSystemStore.getState().activeTab).toBe('dashboard');
    });
});

describe('Toasts', () => {
    it('should add a toast with generated id', () => {
        const store = useSystemStore.getState();
        store.addToast({ type: 'success', title: 'Test Toast' });

        const toasts = useSystemStore.getState().toasts;
        expect(toasts).toHaveLength(1);
        expect(toasts[0].type).toBe('success');
        expect(toasts[0].title).toBe('Test Toast');
        expect(toasts[0].id).toMatch(/^toast-/);
    });

    it('should remove a toast by id', () => {
        const store = useSystemStore.getState();
        store.addToast({ type: 'info', title: 'Removable' });

        const toastId = useSystemStore.getState().toasts[0].id;
        store.removeToast(toastId);

        expect(useSystemStore.getState().toasts).toHaveLength(0);
    });

    it('should add multiple toasts', () => {
        const store = useSystemStore.getState();
        store.addToast({ type: 'success', title: 'First' });
        store.addToast({ type: 'error', title: 'Second' });

        expect(useSystemStore.getState().toasts).toHaveLength(2);
    });
});

describe('EV State', () => {
    it('should update EV state', () => {
        const store = useSystemStore.getState();
        store.setEVState({
            battery_soc: 50,
            current_node: 5,
            battery_capacity_kwh: 75,
        });

        const state = useSystemStore.getState().currentEVState;
        expect(state.battery_soc).toBe(50);
        expect(state.current_node).toBe(5);
        expect(state.battery_capacity_kwh).toBe(75);
    });
});

describe('Loading', () => {
    it('should set loading state', () => {
        const store = useSystemStore.getState();
        store.setIsLoading(true);
        expect(useSystemStore.getState().isLoading).toBe(true);

        store.setIsLoading(false);
        expect(useSystemStore.getState().isLoading).toBe(false);
    });
});

describe('Routes', () => {
    it('should set generated routes', () => {
        const mockRoutes = [
            {
                path: [0, 1, 2],
                distance_km: 5.0,
                energy_kwh: 2.5,
                time_minutes: 10,
                feasibility_score: 0.95,
                charging_stops: [],
            },
        ];

        const store = useSystemStore.getState();
        store.setGeneratedRoutes(mockRoutes);
        expect(useSystemStore.getState().generatedRoutes).toEqual(mockRoutes);
    });

    it('should set selected route', () => {
        const mockRoute = {
            path: [0, 1],
            distance_km: 3.0,
            energy_kwh: 1.5,
            time_minutes: 5,
            feasibility_score: 0.9,
            charging_stops: [],
        };

        const store = useSystemStore.getState();
        store.setSelectedRoute(mockRoute);
        expect(useSystemStore.getState().selectedRoute).toEqual(mockRoute);

        store.setSelectedRoute(null);
        expect(useSystemStore.getState().selectedRoute).toBeNull();
    });
});
