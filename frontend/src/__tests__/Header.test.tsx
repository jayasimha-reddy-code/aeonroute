/**
 * Header Component Tests
 * ======================
 * Verifies Header renders correctly with API mocking.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Header from '../components/Header';
import { useSystemStore } from '../store/store';

// Mock the api module to prevent network calls
vi.mock('../services/api', () => ({
    default: {
        healthCheck: vi.fn().mockResolvedValue({ status: 'ok' }),
        getSystemStats: vi.fn().mockResolvedValue({}),
    },
}));

beforeEach(() => {
    vi.useFakeTimers();
    useSystemStore.setState({
        sidebarCollapsed: false,
        mobileSidebarOpen: false,
    });
});

afterEach(() => {
    vi.useRealTimers();
});

describe('Header', () => {
    it('renders without crashing', async () => {
        await act(async () => {
            render(<Header />);
        });
        expect(document.querySelector('header')).toBeTruthy();
    });

    it('renders the header element', async () => {
        await act(async () => {
            render(<Header />);
        });
        const header = document.querySelector('header');
        expect(header).toBeTruthy();
        expect(header?.tagName).toBe('HEADER');
    });

    it('renders app title text', async () => {
        await act(async () => {
            render(<Header />);
        });
        expect(screen.getByText(/EV Routing/i)).toBeTruthy();
    });

    it('renders theme toggle button', async () => {
        await act(async () => {
            render(<Header />);
        });
        const themeButton = screen.getByRole('button', { name: /theme.*click to switch/i });
        expect(themeButton).toBeTruthy();
    });

    it('renders mobile menu button', async () => {
        await act(async () => {
            render(<Header />);
        });
        const menuButton = screen.getByRole('button', { name: /open navigation/i });
        expect(menuButton).toBeTruthy();
    });
});
