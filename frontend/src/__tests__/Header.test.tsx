/**
 * Header Component Tests
 * ======================
 * Verifies Header renders correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Header from '../components/layout/Header';
import { useSystemStore } from '../store/store';

import { MemoryRouter } from 'react-router-dom';

beforeEach(() => {
    useSystemStore.setState({
        activeTab: 'dashboard',
    });
});

describe('Header', () => {
    it('renders without crashing', async () => {
        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/dashboard']}>
                    <Header />
                </MemoryRouter>
            );
        });
        expect(document.querySelector('header')).toBeTruthy();
    });

    it('renders the header element', async () => {
        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/dashboard']}>
                    <Header />
                </MemoryRouter>
            );
        });
        const header = document.querySelector('header');
        expect(header).toBeTruthy();
        expect(header?.tagName).toBe('HEADER');
    });

    it('renders page title for active tab', async () => {
        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/dashboard']}>
                    <Header />
                </MemoryRouter>
            );
        });
        expect(screen.getByText('Dashboard')).toBeTruthy();
    });

    it('renders action buttons', async () => {
        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/dashboard']}>
                    <Header />
                </MemoryRouter>
            );
        });
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBe(3);
    });

    it('updates title when tab changes', async () => {
        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/training']}>
                    <Header />
                </MemoryRouter>
            );
        });
        expect(screen.getByText('Training')).toBeTruthy();
    });
});
