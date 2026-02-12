/**
 * StatCard Component Tests
 * =========================
 * Verifies StatCard renders title, value, and icon correctly.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatCard from '../components/StatCard';
import { Activity } from 'lucide-react';

describe('StatCard', () => {
    it('renders without crashing', () => {
        const { container } = render(
            <StatCard title="Test" value="100" icon={Activity} color="primary" />
        );
        expect(container.firstChild).toBeTruthy();
    });

    it('renders title and value', () => {
        render(<StatCard title="Total Routes" value="42" icon={Activity} color="primary" />);
        expect(screen.getByText(/Total Routes/i)).toBeTruthy();
        expect(screen.getByText('42')).toBeTruthy();
    });
});
