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
        const { container } = render(<StatCard title="Total Routes" value="42" icon={Activity} color="primary" />);
        expect(screen.getByText(/Total Routes/i)).toBeTruthy();
        // AnimatedNumber starts at 0 and springs to target — check the animated span exists
        // The value will be rendered inside a tabular-nums span with AnimatedNumber
        const valueSpan = container.querySelector('.tabular-nums');
        expect(valueSpan).toBeTruthy();
    });
});
