import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { RewardPoint } from '../../store/store';

interface RewardCurveChartProps {
  data: RewardPoint[];
  rlEpisode?: number;
  rlTotalEpisodes?: number;
}

/** Compute moving average with the given window size. */
function withMovingAvg(data: RewardPoint[], window = 20) {
  return data.map((pt, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    const avg = slice.reduce((sum, p) => sum + p.reward, 0) / slice.length;
    return { ...pt, avg_reward: Math.round(avg * 1000) / 1000 };
  });
}

export function RewardCurveChart({ data, rlEpisode, rlTotalEpisodes }: RewardCurveChartProps) {
  const chartData = useMemo(() => {
    const enriched = withMovingAvg(data);
    // Down-sample for rendering perf when dataset is large
    if (enriched.length > 200) {
      return enriched.filter((_, i) => i % 2 === 0 || i === enriched.length - 1);
    }
    return enriched;
  }, [data.length]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted text-sm">
        Waiting for agent training data…
      </div>
    );
  }

  return (
    <div>
      {rlEpisode != null && rlTotalEpisodes != null && rlTotalEpisodes > 0 && (
        <p className="text-xs text-muted mb-2">Episode {rlEpisode}/{rlTotalEpisodes}</p>
      )}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="#334155" strokeOpacity={0.2} />
          <XAxis
            dataKey="episode"
            tick={{ fontSize: 11, fill: '#64748B' }}
            tickLine={false}
            axisLine={{ stroke: '#334155', strokeOpacity: 0.3 }}
            label={{ value: 'Episode', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: '#64748B' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748B' }}
            tickLine={false}
            axisLine={{ stroke: '#334155', strokeOpacity: 0.3 }}
            label={{ value: 'Reward', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: '#64748B' }}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(15,23,42,0.9)',
              border: '1px solid rgba(51,65,85,0.5)',
              borderRadius: 8,
              fontSize: 12,
              color: '#e2e8f0',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Line
            type="monotone"
            dataKey="reward"
            name="Raw Reward"
            stroke="#3B82F6"
            strokeWidth={1}
            strokeOpacity={0.4}
            dot={false}
            animationDuration={300}
          />
          <Line
            type="monotone"
            dataKey="avg_reward"
            name="Moving Avg (20)"
            stroke="#10B981"
            strokeWidth={2}
            dot={false}
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default RewardCurveChart;
