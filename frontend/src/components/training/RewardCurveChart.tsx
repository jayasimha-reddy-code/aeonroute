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
import { tooltipStyle, axisStyle, gridStyle, areaGradient, CHART_COLORS, cursorStyle } from '../../lib/chartConfig';

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
            {areaGradient('gRawReward', CHART_COLORS.cyan, 0.4, 0)}
            {areaGradient('gAvgReward', CHART_COLORS.emerald, 0.5, 0)}
          </defs>
          <CartesianGrid {...gridStyle} vertical={false} />
          <XAxis
            dataKey="episode"
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            label={{ value: 'Episode', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
          />
          <YAxis
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            label={{ value: 'Reward', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={cursorStyle} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Area
            type="monotone"
            dataKey="reward"
            name="Raw Reward"
            stroke={CHART_COLORS.cyan}
            strokeWidth={1.5}
            strokeOpacity={0.6}
            fill="url(#gRawReward)"
            dot={false}
            animationDuration={300}
          />
          <Area
            type="monotone"
            dataKey="avg_reward"
            name="Moving Avg (20)"
            stroke={CHART_COLORS.emerald}
            strokeWidth={2}
            fill="url(#gAvgReward)"
            dot={false}
            activeDot={{ r: 4, fill: CHART_COLORS.emerald, stroke: '#fff', strokeWidth: 2 }}
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default RewardCurveChart;
