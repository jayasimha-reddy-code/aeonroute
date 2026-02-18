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
        const nav = screen.getByRole('navigation', { name: /main/i });
        expect(nav).toBeTruthy();
    });

    it('renders primary nav items', async () => {
        await act(async () => {
            render(<Sidebar />);
        });
        expect(screen.getByText('Dashboard')).toBeTruthy();
        expect(screen.getByText('Map')).toBeTruthy();
        expect(screen.getByText('Overview')).toBeTruthy();
        expect(screen.getByText('Stations')).toBeTruthy();
        expect(screen.getByText('Settings')).toBeTruthy();
    });

    it('active tab has aria-current="page"', async () => {
        useSystemStore.setState({ activeTab: 'dashboard' });
        await act(async () => {
            render(<Sidebar />);
        });
        const dashboardButton = screen.getByText('Dashboard').closest('button');
        expect(dashboardButton?.getAttribute('aria-current')).toBe('page');
    });

    it('renders EV Routing System branding', async () => {
        await act(async () => {
            render(<Sidebar />);
        });
        expect(screen.getByText('EV Routing System')).toBeTruthy();
    });
});
