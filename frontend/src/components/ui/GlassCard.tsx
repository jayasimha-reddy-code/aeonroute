// Backward compatibility — re-exports Card with variant prop adapter
import { forwardRef, type HTMLAttributes } from 'react';
import { Card } from './Card';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'glow';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  noise?: boolean;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ variant, padding, noise: _noise, ...props }, ref) => {
    const hover = variant === 'interactive';
    const glow = variant === 'glow' ? 'emerald' as const : 'none' as const;
    return <Card ref={ref} hover={hover} glow={glow} padding={padding} {...props} />;
  },
);
GlassCard.displayName = 'GlassCard';
export default GlassCard;
export { GlassCard };
