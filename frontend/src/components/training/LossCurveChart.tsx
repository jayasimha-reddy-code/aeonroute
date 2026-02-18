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
import type { LossPoint } from '../../store/store';

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
        <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="#334155" strokeOpacity={0.2} />
          <XAxis
            dataKey="epoch"
            tick={{ fontSize: 11, fill: '#64748B' }}
            tickLine={false}
            axisLine={{ stroke: '#334155', strokeOpacity: 0.3 }}
            label={{ value: 'Epoch', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: '#64748B' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748B' }}
            tickLine={false}
            axisLine={{ stroke: '#334155', strokeOpacity: 0.3 }}
            label={{ value: 'Loss', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: '#64748B' }}
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
            dataKey="g_loss"
            name="Generator Loss"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={false}
            animationDuration={300}
          />
          <Line
            type="monotone"
            dataKey="d_loss_real"
            name="Disc. Real"
            stroke="#14A8C0"
            strokeWidth={2}
            dot={false}
            animationDuration={300}
          />
          <Line
            type="monotone"
            dataKey="d_loss_fake"
            name="Disc. Fake"
            stroke="#EF4444"
            strokeWidth={2}
            dot={false}
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default LossCurveChart;
