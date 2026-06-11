/**
 * Sidebar Component Tests
 * ========================
 * Verifies Sidebar navigation rendering and ARIA attributes.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Sidebar from '../components/layout/Sidebar';
import { useSystemStore } from '../store/store';

import { MemoryRouter } from 'react-router-dom';

beforeEach(() => {
    useSystemStore.setState({
        activeTab: 'dashboard',
    });
});

describe('Sidebar', () => {
    it('renders without crashing', async () => {
        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/dashboard']}>
                    <Sidebar />
                </MemoryRouter>
            );
        });
        expect(document.querySelector('nav')).toBeTruthy();
    });

    it('renders navigation with aria-label', async () => {
        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/dashboard']}>
                    <Sidebar />
                </MemoryRouter>
            );
        });
        const nav = screen.getByRole('navigation', { name: /main/i });
        expect(nav).toBeTruthy();
    });

    it('renders primary nav items', async () => {
        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/dashboard']}>
                    <Sidebar />
                </MemoryRouter>
            );
        });
        expect(screen.getByText('Dashboard')).toBeTruthy();
        expect(screen.getByText('Map')).toBeTruthy();
        expect(screen.getByText('Overview')).toBeTruthy();
        expect(screen.getByText('Stations')).toBeTruthy();
        expect(screen.getByText('Settings')).toBeTruthy();
    });

    it('active tab has aria-current="page"', async () => {
        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/dashboard']}>
                    <Sidebar />
                </MemoryRouter>
            );
        });
        const dashboardButton = screen.getByRole('link', { name: /dashboard/i });
        expect(dashboardButton?.getAttribute('aria-current')).toBe('page');
    });

    it('renders EV Routing System branding', async () => {
        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/dashboard']}>
                    <Sidebar />
                </MemoryRouter>
            );
        });
        expect(screen.getByText('EV Routing System')).toBeTruthy();
    });
});
