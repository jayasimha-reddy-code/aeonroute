/**
 * Header Component Tests
 * ======================
 * Verifies Header renders correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Header from '../components/Header';
import { useSystemStore } from '../store/store';

beforeEach(() => {
    useSystemStore.setState({
        activeTab: 'dashboard',
    });
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

    it('renders page title for active tab', async () => {
        await act(async () => {
            render(<Header />);
        });
        expect(screen.getByText('Dashboard')).toBeTruthy();
    });

    it('renders action buttons', async () => {
        await act(async () => {
            render(<Header />);
        });
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBe(3);
    });

    it('updates title when tab changes', async () => {
        useSystemStore.setState({ activeTab: 'training' });
        await act(async () => {
            render(<Header />);
        });
        expect(screen.getByText('Training')).toBeTruthy();
    });
});
