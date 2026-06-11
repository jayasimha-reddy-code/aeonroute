import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card } from '../../ui';
import { Battery } from 'lucide-react';

const ENERGY_DATA = [
  { time: '13:00', solar: 280, grid: 120 },
  { time: '14:00', solar: 310, grid: 100 },
  { time: '15:00', solar: 340, grid: 90 },
  { time: '16:00', solar: 290, grid: 130 },
  { time: '17:00', solar: 260, grid: 160 },
  { time: '18:00', solar: 200, grid: 200 },
  { time: '19:00', solar: 120, grid: 260 },
  { time: '20:00', solar: 60, grid: 300 },
];

export function EnergyStackedBar() {
  return (
    <Card className="group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald/10">
            <Battery className="w-3.5 h-3.5 text-emerald" />
          </div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Energy Source Breakdown (Solar vs Grid)
          </h3>
        </div>

      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={ENERGY_DATA}>
          <XAxis
            dataKey="time"
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(10,15,22,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#e2e8f0',
            }}
            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
          />
          <Bar dataKey="solar" stackId="energy" fill="#10b981" radius={[0, 0, 0, 0]} name="Solar" />
          <Bar dataKey="grid" stackId="energy" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Grid" />
        </BarChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald" />
          <span className="text-xs text-slate-400">Solar</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span className="text-xs text-slate-400">Grid</span>
        </div>
      </div>
    </Card>
  );
}

export default EnergyStackedBar;
