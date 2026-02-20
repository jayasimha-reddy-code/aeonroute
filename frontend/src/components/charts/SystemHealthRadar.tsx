import { useState, useEffect } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '../ui';
import { Shield } from 'lucide-react';

interface RadarMetric {
  subject: string;
  A: number;
  fullMark?: number;
}

const FALLBACK_DATA: RadarMetric[] = [
  { subject: 'Nodes', A: 85, fullMark: 100 },
  { subject: 'Power', A: 72, fullMark: 100 },
  { subject: 'Latency', A: 91, fullMark: 100 },
  { subject: 'Energy Source', A: 68, fullMark: 100 },
  { subject: 'System Metrics', A: 94, fullMark: 100 },
  { subject: 'Commit Health', A: 80, fullMark: 100 },
];

export function SystemHealthRadar() {
  const [data, setData] = useState<RadarMetric[]>(FALLBACK_DATA);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const res = await fetch('/api/analytics/system-health');
        const json = await res.json();
        if (mounted && json?.status !== 'not_trained' && Array.isArray(json?.data)) {
          setData(json.data);
        }
      } catch {
        // Use fallback data
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, []);

  return (
    <Card className="group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald/10">
            <Shield className="w-3.5 h-3.5 text-emerald" />
          </div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            System Health Metrics
          </h3>
        </div>

      </div>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="rgba(255,255,255,0.06)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
          />
          <PolarRadiusAxis tick={false} axisLine={false} />
          <Radar
            dataKey="A"
            stroke="#10b981"
            strokeWidth={2}
            fill="#10b981"
            fillOpacity={0.15}
            dot={{ r: 3, fill: '#10b981' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export default SystemHealthRadar;
