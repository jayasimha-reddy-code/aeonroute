/**
 * Header Component Tests
 * ======================
 * Verifies Header renders correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '../components/Header';
import { useSystemStore } from '../store/store';

beforeEach(() => {
    useSystemStore.setState({
        themeMode: 'light',
        isDarkMode: false,
        sidebarCollapsed: false,
    });
});

describe('Header', () => {
    it('renders without crashing', () => {
        const { container } = render(<Header />);
        expect(container).toBeInTheDocument();
    });

    it('renders app title', () => {
        render(<Header />);
        // The header should contain "EV" and "Route" text
        const header = screen.getByRole('banner');
        expect(header).toBeInTheDocument();
    });
});
