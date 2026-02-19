import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
        <AreaChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="gRawReward" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gAvgReward" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis
            dataKey="episode"
            tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            label={{ value: 'Episode', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            label={{ value: 'Reward', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(10, 15, 22, 0.95)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '12px',
              boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Area
            type="monotone"
            dataKey="reward"
            name="Raw Reward"
            stroke="#3B82F6"
            strokeWidth={1}
            strokeOpacity={0.4}
            fill="url(#gRawReward)"
            dot={false}
            animationDuration={300}
          />
          <Area
            type="monotone"
            dataKey="avg_reward"
            name="Moving Avg (20)"
            stroke="#10B981"
            strokeWidth={2}
            fill="url(#gAvgReward)"
            dot={false}
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default RewardCurveChart;
