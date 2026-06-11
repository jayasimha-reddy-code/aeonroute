/**
 * Zustand Store Unit Tests
 * ========================
 * Verifies core store actions work correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore, useDomainStore } from '../store/store';

// Reset store state before each test
beforeEach(() => {
    useUIStore.setState({
        activeTab: 'dashboard',
        toasts: [],
        isLoading: false,
        globalError: null,
    });
    useDomainStore.setState({
        roadNetwork: null,
        generatedRoutes: [],
        selectedRoute: null,
        currentEVState: {
            battery_soc: 80,
            current_node: 0,
            battery_capacity_kwh: 60,
        },
    });
});

describe('Navigation', () => {
    it('should set active tab', () => {
        useUIStore.getState().setActiveTab('training');
        expect(useUIStore.getState().activeTab).toBe('training');
    });

    it('should default to dashboard tab', () => {
        expect(useUIStore.getState().activeTab).toBe('dashboard');
    });
});

describe('Toasts', () => {
    it('should add a toast with generated id', () => {
        useUIStore.getState().addToast({ type: 'success', title: 'Test Toast' });

        const toasts = useUIStore.getState().toasts;
        expect(toasts).toHaveLength(1);
        expect(toasts[0].type).toBe('success');
        expect(toasts[0].title).toBe('Test Toast');
        expect(toasts[0].id).toMatch(/^toast-/);
    });

    it('should remove a toast by id', () => {
        useUIStore.getState().addToast({ type: 'info', title: 'Removable' });

        const toastId = useUIStore.getState().toasts[0].id;
        useUIStore.getState().removeToast(toastId);

        expect(useUIStore.getState().toasts).toHaveLength(0);
    });

    it('should add multiple toasts', () => {
        useUIStore.getState().addToast({ type: 'success', title: 'First' });
        useUIStore.getState().addToast({ type: 'error', title: 'Second' });

        expect(useUIStore.getState().toasts).toHaveLength(2);
    });
});

describe('EV State', () => {
    it('should update EV state', () => {
        useDomainStore.getState().setEVState({
            battery_soc: 50,
            current_node: 5,
            battery_capacity_kwh: 75,
        });

        const state = useDomainStore.getState().currentEVState;
        expect(state.battery_soc).toBe(50);
        expect(state.current_node).toBe(5);
        expect(state.battery_capacity_kwh).toBe(75);
    });
});

describe('Loading', () => {
    it('should set loading state', () => {
        useUIStore.getState().setIsLoading(true);
        expect(useUIStore.getState().isLoading).toBe(true);

        useUIStore.getState().setIsLoading(false);
        expect(useUIStore.getState().isLoading).toBe(false);
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

        useDomainStore.getState().setGeneratedRoutes(mockRoutes);
        expect(useDomainStore.getState().generatedRoutes).toEqual(mockRoutes);
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

        useDomainStore.getState().setSelectedRoute(mockRoute);
        expect(useDomainStore.getState().selectedRoute).toEqual(mockRoute);

        useDomainStore.getState().setSelectedRoute(null);
        expect(useDomainStore.getState().selectedRoute).toBeNull();
    });
});
