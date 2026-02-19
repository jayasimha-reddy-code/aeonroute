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
import type { LossPoint } from '../../store/store';
import { tooltipStyle, axisStyle, gridStyle, areaGradient, CHART_COLORS, cursorStyle } from '../../lib/chartConfig';

interface LossCurveChartProps {
  data: LossPoint[];
  ganEpoch?: number;
  ganTotalEpochs?: number;
}

export function LossCurveChart({ data, ganEpoch, ganTotalEpochs }: LossCurveChartProps) {
  const chartData = useMemo(() => data, [data.length]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted text-sm">
        Waiting for GAN training data…
      </div>
    );
  }

  return (
    <div>
      {ganEpoch != null && ganTotalEpochs != null && ganTotalEpochs > 0 && (
        <p className="text-xs text-muted mb-2">Epoch {ganEpoch}/{ganTotalEpochs}</p>
      )}
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
          <defs>
            {areaGradient('gLossGen', CHART_COLORS.amber, 0.5, 0)}
            {areaGradient('gLossDiscReal', CHART_COLORS.cyan, 0.5, 0)}
            {areaGradient('gLossDiscFake', CHART_COLORS.rose, 0.5, 0)}
          </defs>
          <CartesianGrid {...gridStyle} vertical={false} />
          <XAxis
            dataKey="epoch"
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            label={{ value: 'Epoch', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
          />
          <YAxis
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            label={{ value: 'Loss', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={cursorStyle} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Area
            type="monotone"
            dataKey="g_loss"
            name="Generator Loss"
            stroke={CHART_COLORS.amber}
            strokeWidth={2}
            fill="url(#gLossGen)"
            dot={false}
            activeDot={{ r: 4, fill: CHART_COLORS.amber, stroke: '#fff', strokeWidth: 2 }}
            animationDuration={300}
          />
          <Area
            type="monotone"
            dataKey="d_loss_real"
            name="Disc. Real"
            stroke={CHART_COLORS.cyan}
            strokeWidth={2}
            fill="url(#gLossDiscReal)"
            dot={false}
            activeDot={{ r: 4, fill: CHART_COLORS.cyan, stroke: '#fff', strokeWidth: 2 }}
            animationDuration={300}
          />
          <Area
            type="monotone"
            dataKey="d_loss_fake"
            name="Disc. Fake"
            stroke={CHART_COLORS.rose}
            strokeWidth={2}
            fill="url(#gLossDiscFake)"
            dot={false}
            activeDot={{ r: 4, fill: CHART_COLORS.rose, stroke: '#fff', strokeWidth: 2 }}
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default LossCurveChart;
