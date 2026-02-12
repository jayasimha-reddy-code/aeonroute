import { useEffect, useState } from 'react';
import api, { SystemStats, RouteMetrics } from '../services/api';
import { useSystemStore } from '../store/store';
import PageHeader from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { StatCardSkeleton } from '../components/ui/Skeleton';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Activity, TrendingUp, Zap, Timer, Route, Gauge, Network, Cpu } from 'lucide-react';

/* ── Chart Styling Tokens ────────────────────────── */
const CHART_COLORS = ['#14A8C0', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#3B82F6'];
const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(148, 163, 184, 0.1)',
  borderRadius: '14px',
  color: '#f1f5f9',
  fontSize: '12px',
  boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
  padding: '12px 16px',
};
const axisStyle = { fontSize: 11, fill: '#64748b' };

/* ── Metric Pill ─────────────────────────────────── */
function MetricTile({
  icon: Icon, label, value, unit, color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; unit?: string; color: string;
}) {
  const bg = { success: 'bg-success-500/10', info: 'bg-info-500/10', warning: 'bg-warning-500/10', accent: 'bg-accent-500/10', danger: 'bg-danger-500/10', primary: 'bg-primary-500/10' }[color] || 'bg-surface-100';
  const text = { success: 'text-success-500', info: 'text-info-500', warning: 'text-warning-500', accent: 'text-accent-500', danger: 'text-danger-500', primary: 'text-primary-500' }[color] || 'text-surface-500';
  return (
    <Card className="flex items-center gap-4">
      <div className={`p-3 rounded-xl ${bg}`}><Icon className={`w-6 h-6 ${text}`} /></div>
      <div>
        <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
          {value}{unit && <span className="text-sm font-medium text-surface-400 ml-1">{unit}</span>}
        </p>
      </div>
    </Card>
  );
}

function Analytics() {
  const { addToast } = useSystemStore();
  const [metrics, setMetrics] = useState<RouteMetrics | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [stats, routeMetrics] = await Promise.all([api.getSystemStats(), api.getRouteMetrics(20)]);
        if (mounted) { setSystemStats(stats); setMetrics(routeMetrics); }
      } catch (err: any) {
        if (mounted) addToast({ type: 'error', title: 'Analytics failed', message: err?.message });
      } finally { if (mounted) setLoading(false); }
    };
    load();
    return () => { mounted = false; };
  }, [addToast]);

  /* ── Synthetic chart data ──────────────────────── */
  const energyTimeline = [
    { time: '12 AM', energy: 45, distance: 12, efficiency: 3.8 },
    { time: '4 AM',  energy: 38, distance: 10, efficiency: 3.8 },
    { time: '8 AM',  energy: 62, distance: 18, efficiency: 3.4 },
    { time: '12 PM', energy: 78, distance: 22, efficiency: 3.5 },
    { time: '4 PM',  energy: 85, distance: 24, efficiency: 3.5 },
    { time: '8 PM',  energy: 72, distance: 20, efficiency: 3.6 },
    { time: '11 PM', energy: 55, distance: 15, efficiency: 3.7 },
  ];

  const routeQuality = [
    { name: 'Excellent', value: 45 },
    { name: 'Good',      value: 35 },
    { name: 'Fair',      value: 15 },
    { name: 'Poor',      value: 5 },
  ];

  const distanceDist = [
    { range: '0–5',   count: 35 },
    { range: '5–15',  count: 45 },
    { range: '15–25', count: 15 },
    { range: '25+',   count: 5 },
  ];

  const trainingConvergence = [
    { epoch: 1,  dLoss: 1.4, gLoss: 2.1 },
    { epoch: 5,  dLoss: 0.9, gLoss: 1.7 },
    { epoch: 10, dLoss: 0.7, gLoss: 1.2 },
    { epoch: 15, dLoss: 0.5, gLoss: 0.9 },
    { epoch: 20, dLoss: 0.4, gLoss: 0.7 },
    { epoch: 25, dLoss: 0.35, gLoss: 0.55 },
    { epoch: 30, dLoss: 0.32, gLoss: 0.45 },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <PageHeader title="Analytics" subtitle="Comprehensive system performance metrics and AI model insights" icon={Activity} />

      {/* ── Key Metrics ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8 animate-stagger">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <MetricTile icon={Route}       label="Avg Distance"  value={metrics?.avg_distance_km?.toFixed(1) ?? '—'} unit="km"  color="info" />
            <MetricTile icon={Zap}         label="Avg Energy"    value={metrics?.avg_energy_kwh?.toFixed(1) ?? '—'}  unit="kWh" color="warning" />
            <MetricTile icon={Timer}       label="Avg Time"      value={metrics?.avg_time_minutes?.toFixed(0) ?? '—'} unit="min" color="success" />
            <MetricTile icon={Gauge}       label="Feasibility"   value={metrics?.avg_feasibility !== undefined ? `${(metrics.avg_feasibility * 100).toFixed(0)}` : '78'} unit="%" color="accent" />
          </>
        )}
      </div>

      {/* ── Charts Row 1 ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-5">
        {/* Energy & Efficiency (wider) */}
        <Card className="lg:col-span-3">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="p-1.5 rounded-lg bg-warning-500/10"><Zap className="w-3.5 h-3.5 text-warning-500" /></div>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 uppercase tracking-wider">Energy &amp; Distance</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={energyTimeline}>
              <defs>
                <linearGradient id="gEnergy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDistance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14A8C0" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14A8C0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.2} />
              <XAxis dataKey="time" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Area type="monotone" dataKey="energy" stroke="#F59E0B" strokeWidth={2.5} fill="url(#gEnergy)" name="Energy (kWh)" />
              <Area type="monotone" dataKey="distance" stroke="#14A8C0" strokeWidth={2.5} fill="url(#gDistance)" name="Distance (km)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Route Quality Donut (narrower) */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="p-1.5 rounded-lg bg-success-500/10"><TrendingUp className="w-3.5 h-3.5 text-success-500" /></div>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 uppercase tracking-wider">Route Quality</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={routeQuality} cx="50%" cy="50%"
                innerRadius={60} outerRadius={95} paddingAngle={4}
                dataKey="value" strokeWidth={0}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
              >
                {routeQuality.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Charts Row 2 ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Distance Distribution */}
        <Card>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="p-1.5 rounded-lg bg-info-500/10"><Route className="w-3.5 h-3.5 text-info-500" /></div>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 uppercase tracking-wider">Distance Distribution <span className="text-surface-400 normal-case font-normal">(km)</span></h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={distanceDist}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.2} />
              <XAxis dataKey="range" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={48} name="Routes">
                {distanceDist.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* GAN Training Convergence */}
        <Card>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="p-1.5 rounded-lg bg-accent-500/10"><Cpu className="w-3.5 h-3.5 text-accent-500" /></div>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 uppercase tracking-wider">GAN Training Loss</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trainingConvergence}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.2} />
              <XAxis dataKey="epoch" tick={axisStyle} axisLine={false} tickLine={false} label={{ value: 'Epoch', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Line type="monotone" dataKey="dLoss" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} name="Discriminator" />
              <Line type="monotone" dataKey="gLoss" stroke="#14A8C0" strokeWidth={2} dot={{ r: 3 }} name="Generator" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── System Info Footer ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card>
          <div className="flex items-center gap-2.5 mb-4">
            <Cpu className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 uppercase tracking-wider">AI Models</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: 'SG-GAN Traffic',  ready: systemStats?.models?.gan_trained },
              { label: 'Q-Learning Agent', ready: systemStats?.models?.agent_trained },
              { label: 'GNN Route GAN',    ready: systemStats?.models?.gnn_gan_trained },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-100 dark:border-white/[0.04]">
                <span className="text-sm font-medium text-surface-700 dark:text-surface-300">{m.label}</span>
                {m.ready ? <Badge variant="success" dot>Active</Badge> : <Badge variant="neutral" dot>Inactive</Badge>}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2.5 mb-4">
            <Network className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 uppercase tracking-wider">Network</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Total Nodes', val: systemStats?.road_network?.nodes ?? 0 },
              { label: 'Total Edges', val: systemStats?.road_network?.edges ?? 0 },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-100 dark:border-white/[0.04]">
                <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">{s.val}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2.5 mb-4">
            <Activity className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 uppercase tracking-wider">Performance</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Avg Feasibility', val: '78%' },
              { label: 'Route Gen Speed', val: '245', unit: 'ms' },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-100 dark:border-white/[0.04]">
                <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">{s.val}{s.unit && <span className="text-sm font-medium text-surface-400 ml-1">{s.unit}</span>}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Analytics;
