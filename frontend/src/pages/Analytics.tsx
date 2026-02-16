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

  /* ── Live evaluation state ───────────────────────── */
  const [ganEval, setGanEval] = useState<Record<string, any> | null>(null);
  const [agentPerf, setAgentPerf] = useState<Record<string, any> | null>(null);
  const [routeEval, setRouteEval] = useState<Record<string, any> | null>(null);
  const [trainingHistory, setTrainingHistory] = useState<{
    loss_history: { epoch: number; g_loss: number; d_loss_real: number }[];
    reward_history: { episode: number; reward: number }[];
    metrics: Record<string, any>;
  } | null>(null);
  const [evalLoading, setEvalLoading] = useState(true);
  const [modelsReady, setModelsReady] = useState(true);

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

  /* Fetch evaluation data from the 4 new endpoints */
  useEffect(() => {
    let mounted = true;
    const loadEval = async () => {
      const results = await Promise.allSettled([
        api.getGanEvaluation(),
        api.getAgentPerformance(),
        api.getRouteEvaluation(),
        api.getTrainingHistory(),
      ]);
      if (!mounted) return;

      const [ganRes, agentRes, routeRes, historyRes] = results;

      // If all model endpoints return 503, models aren't trained
      const allUnavailable = [ganRes, agentRes, routeRes].every(
        (r) => r.status === 'rejected' && (r.reason as any)?.status === 503,
      );
      if (allUnavailable) setModelsReady(false);

      if (ganRes.status === 'fulfilled') setGanEval(ganRes.value);
      if (agentRes.status === 'fulfilled') setAgentPerf(agentRes.value);
      if (routeRes.status === 'fulfilled') setRouteEval(routeRes.value);
      if (historyRes.status === 'fulfilled') setTrainingHistory(historyRes.value);

      setEvalLoading(false);
    };
    loadEval();
    return () => { mounted = false; };
  }, []);

  /* ── Derive chart data from live results ──────────── */
  const trainingConvergence = trainingHistory?.loss_history?.length
    ? trainingHistory.loss_history.map((h) => ({ epoch: h.epoch, dLoss: h.d_loss_real, gLoss: h.g_loss }))
    : [
        { epoch: 1, dLoss: 1.4, gLoss: 2.1 },
        { epoch: 5, dLoss: 0.9, gLoss: 1.7 },
        { epoch: 10, dLoss: 0.7, gLoss: 1.2 },
        { epoch: 15, dLoss: 0.5, gLoss: 0.9 },
        { epoch: 20, dLoss: 0.4, gLoss: 0.7 },
        { epoch: 25, dLoss: 0.35, gLoss: 0.55 },
        { epoch: 30, dLoss: 0.32, gLoss: 0.45 },
      ];

  const routeQuality = routeEval
    ? [
        { name: 'Feasible', value: Math.round((routeEval.avg_feasibility_rate ?? 0) * 100) },
        { name: 'Infeasible', value: Math.round((1 - (routeEval.avg_feasibility_rate ?? 0)) * 100) },
      ]
    : [
        { name: 'Excellent', value: 45 },
        { name: 'Good', value: 35 },
        { name: 'Fair', value: 15 },
        { name: 'Poor', value: 5 },
      ];

  const ganQualityBars = ganEval
    ? [
        { label: 'Hourly Corr', value: +(ganEval.hourly_correlation ?? 0).toFixed(2) },
        { label: 'Morning Peak', value: +(ganEval.morning_peak_ratio ?? 0).toFixed(2) },
        { label: 'Evening Peak', value: +(ganEval.evening_peak_ratio ?? 0).toFixed(2) },
        { label: 'Night Ratio', value: +(ganEval.night_ratio ?? 0).toFixed(2) },
      ]
    : [
        { label: '0–5', value: 35 },
        { label: '5–15', value: 45 },
        { label: '15–25', value: 15 },
        { label: '25+', value: 5 },
      ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <PageHeader title="Analytics" subtitle="Comprehensive system performance metrics and AI model insights" icon={Activity} />

      {/* ── Not-trained banner ───────────────────────────── */}
      {!modelsReady && !evalLoading && (
        <Card className="mb-6 border-warning-500/30 bg-warning-500/5">
          <p className="text-sm text-warning-500 font-medium">Models not trained yet — train the system first to see live evaluation data.</p>
        </Card>
      )}

      {/* ── Key Metrics ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8 animate-stagger">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <MetricTile icon={Route}       label="Avg Distance"  value={metrics?.avg_distance_km?.toFixed(1) ?? '—'} unit="km"  color="info" />
            <MetricTile icon={Zap}         label="Avg Energy"    value={metrics?.avg_energy_kwh?.toFixed(1) ?? '—'}  unit="kWh" color="warning" />
            <MetricTile icon={Timer}       label="Avg Time"      value={metrics?.avg_time_minutes?.toFixed(0) ?? '—'} unit="min" color="success" />
            <MetricTile icon={Gauge}       label="Feasibility"   value={routeEval ? `${(routeEval.avg_feasibility_rate * 100).toFixed(0)}` : metrics?.avg_feasibility !== undefined ? `${(metrics.avg_feasibility * 100).toFixed(0)}` : '—'} unit="%" color="accent" />
          </>
        )}
      </div>

      {/* ── Charts Row 1 ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-5">
        {/* Agent Reward / Energy Timeline (wider) */}
        <Card className="lg:col-span-3">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="p-1.5 rounded-lg bg-warning-500/10"><Zap className="w-3.5 h-3.5 text-warning-500" /></div>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 uppercase tracking-wider">
              {trainingHistory?.reward_history?.length ? 'Agent Reward History' : 'Energy & Distance'}
            </h3>
          </div>
          {evalLoading ? (
            <div className="h-[280px] flex items-center justify-center text-surface-400 text-sm">Loading…</div>
          ) : trainingHistory?.reward_history?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trainingHistory.reward_history.map((r, i) => ({ episode: r.episode ?? i + 1, reward: r.reward }))}>
                <defs>
                  <linearGradient id="gReward" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.2} />
                <XAxis dataKey="episode" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Area type="monotone" dataKey="reward" stroke="#10B981" strokeWidth={2.5} fill="url(#gReward)" name="Reward" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={[
                { time: '12 AM', energy: 45, distance: 12 },
                { time: '4 AM',  energy: 38, distance: 10 },
                { time: '8 AM',  energy: 62, distance: 18 },
                { time: '12 PM', energy: 78, distance: 22 },
                { time: '4 PM',  energy: 85, distance: 24 },
                { time: '8 PM',  energy: 72, distance: 20 },
                { time: '11 PM', energy: 55, distance: 15 },
              ]}>
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
          )}
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
        {/* GAN Quality / Distance Distribution */}
        <Card>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="p-1.5 rounded-lg bg-info-500/10"><Route className="w-3.5 h-3.5 text-info-500" /></div>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 uppercase tracking-wider">
              {ganEval ? 'GAN Quality Metrics' : 'Distance Distribution'} <span className="text-surface-400 normal-case font-normal">{ganEval ? '' : '(km)'}</span>
            </h3>
          </div>
          {evalLoading ? (
            <div className="h-[260px] flex items-center justify-center text-surface-400 text-sm">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ganQualityBars}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.2} />
                <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={48} name={ganEval ? 'Value' : 'Routes'}>
                  {ganQualityBars.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
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
              { label: 'Agent Success Rate', val: agentPerf ? `${(agentPerf.success_rate * 100).toFixed(0)}` : '—', unit: '%' },
              { label: 'Energy Improvement', val: routeEval ? `${(routeEval.energy_improvement * 100).toFixed(1)}` : '—', unit: '%' },
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
