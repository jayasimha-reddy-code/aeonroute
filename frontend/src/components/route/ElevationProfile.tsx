import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card } from '../ui';
import { Mountain } from 'lucide-react';
import { tooltipStyle } from '../../lib/chartConfig';

export interface ElevationPoint {
  distance_km: number;
  elevation: number;
}

interface ElevationProfileProps {
  data: ElevationPoint[];
}

export function ElevationProfile({ data }: ElevationProfileProps) {
  if (!data || data.length === 0) return null;

  return (
    <Card className="group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald/10">
            <Mountain className="w-3.5 h-3.5 text-emerald" />
          </div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Elevation Profile
          </h3>
        </div>

      </div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="distance_km"
            tick={{ fill: '#64748b', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v.toFixed(0)} km`}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v.toFixed(0)}m`}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(10,15,22,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#e2e8f0',
              fontSize: '11px',
            }}
            formatter={(val: number) => [`${val.toFixed(0)}m`, 'Elevation']}
            labelFormatter={(label: number) => `${label.toFixed(1)} km`}
          />
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#10b981"
            strokeWidth={1.5}
            fill="url(#elevGradient)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

export default ElevationProfile;
