import { useEffect, useRef, useState } from 'react';

interface HardwareGaugeProps {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
  size?: number;
}

export function HardwareGauge({ label, value, max, unit, color, size = 110 }: HardwareGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const startTime = performance.now();
    const duration = 1500; // 1.5s animation

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(eased * value);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const sweepAngle = 270; // degrees
  const startAngle = 135; // start from bottom-left

  // Background arc path
  const circumference = 2 * Math.PI * radius;
  const arcLength = (sweepAngle / 360) * circumference;
  const dashArray = `${arcLength} ${circumference}`;

  // Value arc
  const valueFraction = Math.min(animatedValue / max, 1);
  const valueArcLength = valueFraction * arcLength;
  const valueOffset = arcLength - valueArcLength;

  const filterId = `glow-${label.replace(/\s/g, '-')}`;

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-[135deg]"
      >
        <defs>
          <filter id={filterId}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          strokeDashoffset={0}
          strokeLinecap="round"
        />

        {/* Value arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          strokeDashoffset={valueOffset}
          strokeLinecap="round"
          filter={`url(#${filterId})`}
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>

      {/* Center text overlaid */}
      <div
        className="absolute flex flex-col items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="text-xl font-bold text-white tabular-nums">
          {Math.round(animatedValue)}
        </span>
        <span className="text-[10px] text-slate-400">{unit}</span>
      </div>

      {/* Label below */}
      <p className="text-xs text-slate-400 mt-1 text-center">{label}</p>
    </div>
  );
}

export default HardwareGauge;
