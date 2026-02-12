/**
 * Sidebar Component Tests
 * ========================
 * Verifies Sidebar navigation rendering.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Sidebar from '../components/Sidebar';
import { useSystemStore } from '../store/store';

beforeEach(() => {
    useSystemStore.setState({
        activeTab: 'dashboard',
        sidebarCollapsed: false,
    });
});

describe('Sidebar', () => {
    it('renders without crashing', () => {
        const { container } = render(<Sidebar />);
        expect(container).toBeInTheDocument();
    });

    it('renders navigation', () => {
        render(<Sidebar />);
        const nav = screen.getByRole('navigation');
        expect(nav).toBeInTheDocument();
    });
});
