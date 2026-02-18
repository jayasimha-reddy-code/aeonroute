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
            <linearGradient id="gLossGen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gLossDiscReal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14A8C0" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#14A8C0" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gLossDiscFake" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.03)" />
          <XAxis
            dataKey="epoch"
            tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            label={{ value: 'Epoch', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            label={{ value: 'Loss', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
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
            dataKey="g_loss"
            name="Generator Loss"
            stroke="#F59E0B"
            strokeWidth={2}
            fill="url(#gLossGen)"
            dot={false}
            animationDuration={300}
          />
          <Area
            type="monotone"
            dataKey="d_loss_real"
            name="Disc. Real"
            stroke="#14A8C0"
            strokeWidth={2}
            fill="url(#gLossDiscReal)"
            dot={false}
            animationDuration={300}
          />
          <Area
            type="monotone"
            dataKey="d_loss_fake"
            name="Disc. Fake"
            stroke="#EF4444"
            strokeWidth={2}
            fill="url(#gLossDiscFake)"
            dot={false}
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default LossCurveChart;
