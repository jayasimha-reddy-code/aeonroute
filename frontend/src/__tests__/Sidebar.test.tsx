/**
 * Sidebar Component Tests
 * ========================
 * Verifies Sidebar navigation rendering and ARIA attributes.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Sidebar from '../components/Sidebar';
import { useSystemStore } from '../store/store';

beforeEach(() => {
    useSystemStore.setState({
        activeTab: 'dashboard',
        sidebarCollapsed: false,
        mobileSidebarOpen: false,
    });
});

describe('Sidebar', () => {
    it('renders without crashing', async () => {
        await act(async () => {
            render(<Sidebar />);
        });
        expect(document.querySelector('nav')).toBeTruthy();
    });

    it('renders navigation with aria-label', async () => {
        await act(async () => {
            render(<Sidebar />);
        });
        const nav = screen.getByRole('navigation', { name: /main navigation/i });
        expect(nav).toBeTruthy();
    });

    it('renders all 4 menu items', async () => {
        await act(async () => {
            render(<Sidebar />);
        });
        expect(screen.getByText('Dashboard')).toBeTruthy();
        expect(screen.getByText('Route Planner')).toBeTruthy();
        expect(screen.getByText('Training')).toBeTruthy();
        expect(screen.getByText('Analytics')).toBeTruthy();
    });

    it('active tab has aria-current="page"', async () => {
        useSystemStore.setState({ activeTab: 'dashboard' });
        await act(async () => {
            render(<Sidebar />);
        });
        const dashboardButton = screen.getByText('Dashboard').closest('button');
        expect(dashboardButton?.getAttribute('aria-current')).toBe('page');
    });
});
