/**
 * Animated Components Tests
 * =========================
 * Verifies Framer Motion mocks work — animated components render without errors.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import PageTransition from '../components/ui/PageTransition';

describe('AnimatedNumber', () => {
  it('renders with a numeric value', () => {
    const { container } = render(<AnimatedNumber value={42} />);
    expect(container.querySelector('span')).toBeTruthy();
  });

  it('renders prefix and suffix', () => {
    const { container } = render(<AnimatedNumber value={85} prefix="$" suffix="%" />);
    const text = container.textContent ?? '';
    expect(text).toContain('$');
    expect(text).toContain('%');
  });
});

describe('PageTransition', () => {
  it('renders children through AnimatePresence mock', () => {
    render(
      <PageTransition pageKey="test">
        <div data-testid="child-content">Hello World</div>
      </PageTransition>,
    );
    expect(screen.getByTestId('child-content')).toBeTruthy();
    expect(screen.getByText('Hello World')).toBeTruthy();
  });
});
