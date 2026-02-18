import { useEffect, useState, useCallback } from 'react';
import api, { TemporalTrafficData } from '../../services/api';
import Skeleton from '../ui/Skeleton';

/** Map a traffic intensity value (0..1) to an HSL color string.
 *  green (120°) → yellow (60°) → red (0°) */
function intensityToColor(value: number): string {
  const clamped = Math.max(0, Math.min(1, value));
  // Map 0→120 (green), 0.5→60 (yellow), 1→0 (red)
  const hue = 120 - clamped * 120;
  return `hsl(${hue}, 70%, 50%)`;
}

/** Format hour (0-23) as 12-hour string with AM/PM */
function formatHour(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

const TICK_HOURS = [0, 6, 12, 18, 23];
const TICK_LABELS = ['12 AM', '6 AM', '12 PM', '6 PM', '11 PM'];

export default function TrafficSlider() {
  const [trafficData, setTrafficData] = useState<TemporalTrafficData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hour, setHour] = useState(12);

  const fetchTraffic = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getTemporalTraffic();
      setTrafficData(data);
    } catch (err: any) {
      if (err?.status === 503) {
        setError('nomodel');
      } else {
        setError(err?.message ?? 'Failed to load traffic data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTraffic();
  }, [fetchTraffic]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton height={24} className="rounded w-full" />
        <Skeleton height={200} className="rounded-xl w-full" />
      </div>
    );
  }

  // ── No model trained ──
  if (error === 'nomodel') {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="text-3xl mb-3">🧠</div>
        <p className="text-sm font-medium text-label">
          Train a model first to see traffic patterns
        </p>
        <p className="text-xs text-muted mt-1">
          The SG-GAN needs to be trained before temporal traffic data is available.
        </p>
      </div>
    );
  }

  // ── Generic error ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  // ── No data ──
  if (!trafficData || trafficData.grid_size === 0 || !trafficData.traffic.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-sm text-muted">No data available</p>
      </div>
    );
  }

  const { grid_size, traffic } = trafficData;

  return (
    <div className="space-y-5">
      {/* ── Hour label ── */}
      <div className="text-center">
        <span className="text-2xl font-bold text-white tabular-nums">
          {formatHour(hour)}
        </span>
      </div>

      {/* ── Slider with ticks ── */}
      <div className="px-1">
        <input
          type="range"
          min={0}
          max={23}
          step={1}
          value={hour}
          onChange={(e) => setHour(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer
            bg-white/[0.04]
            accent-emerald
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-emerald
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-surface
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110"
          aria-label="Hour of day"
        />
        {/* Tick labels */}
        <div className="flex justify-between mt-1.5 px-0.5">
          {TICK_HOURS.map((h, i) => (
            <span
              key={h}
              className="text-[10px] text-muted font-medium"
              style={{ width: i === 0 || i === TICK_HOURS.length - 1 ? 'auto' : undefined }}
            >
              {TICK_LABELS[i]}
            </span>
          ))}
        </div>
      </div>

      {/* ── Heatmap grid ── */}
      <div className="flex justify-center">
        <div
          className="inline-grid gap-[2px] rounded-xl overflow-hidden p-1
            bg-surface-raised"
          style={{
            gridTemplateColumns: `repeat(${grid_size}, 1fr)`,
            maxWidth: `${Math.min(grid_size * 36, 400)}px`,
            width: '100%',
          }}
        >
          {Array.from({ length: grid_size * grid_size }).map((_, idx) => {
            // traffic[road_segment_index][time_step]
            const segmentTraffic = traffic[idx];
            const value = segmentTraffic ? segmentTraffic[hour] ?? 0 : 0;
            return (
              <div
                key={idx}
                className="aspect-square rounded-sm transition-colors duration-200"
                style={{ backgroundColor: intensityToColor(value) }}
                title={`Segment ${idx}: ${(value * 100).toFixed(0)}%`}
              />
            );
          })}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center justify-center gap-2 text-[11px] text-label">
        <span>Low</span>
        <div
          className="h-3 w-32 rounded-full"
          style={{
            background: 'linear-gradient(to right, hsl(120,70%,50%), hsl(60,70%,50%), hsl(0,70%,50%))',
          }}
        />
        <span>High</span>
      </div>
    </div>
  );
}