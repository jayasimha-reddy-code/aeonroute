import { useRef, useState, useEffect } from 'react';

/**
 * Progressive coordinate reveal animation using requestAnimationFrame.
 * Returns a growing subset of fullCoords over durationMs.
 */
export function useAnimatedRoute(
  fullCoords: [number, number][] | null,
  durationMs = 2000,
): [number, number][] {
  const [visible, setVisible] = useState<[number, number][]>([]);
  const rafId = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!fullCoords || fullCoords.length < 2) {
      setVisible([]);
      return;
    }

    // Reset on new coords
    startRef.current = 0;
    setVisible(fullCoords.slice(0, 2));

    const step = (now: number) => {
      if (!startRef.current) startRef.current = now;
      const progress = Math.min((now - startRef.current) / durationMs, 1);
      const count = Math.max(2, Math.ceil(progress * fullCoords.length));
      setVisible(fullCoords.slice(0, count));

      if (progress < 1) {
        rafId.current = requestAnimationFrame(step);
      }
    };

    rafId.current = requestAnimationFrame(step);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [fullCoords, durationMs]);

  return visible;
}