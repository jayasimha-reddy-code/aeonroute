import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import api, { SystemStats, RouteMetrics } from '../services/api';
import { useSystemStore, useViewMode } from '../store/store';
import PageHeader from '../components/PageHeader';
import { Card, Badge } from '../components/ui';
import { StatCardSkeleton } from '../components/ui/Skeleton';
import { cn } from '../lib/utils';
import { hyperStaggerContainer, hyperStaggerItem } from '../lib/motion';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Activity, TrendingUp, Zap, Timer, Route, Gauge, Network, Cpu } from 'lucide-react';
import { tooltipStyle, axisStyle, gridStyle, areaGradient, CHART_COLORS, CHART_PALETTE, cursorStyle } from '../lib/chartConfig';
import SystemHealthRadar from '../components/charts/SystemHealthRadar';
import EnergyStackedBar from '../components/charts/EnergyStackedBar';
import DemandHeatmap from '../components/charts/DemandHeatmap';
import AIInsightsPanel from '../components/analytics/AIInsightsPanel';

/* ── Metric Pill ─────────────────────────────────── */
function MetricTile({
  icon: Icon, label, value, unit, color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; unit?: string; color: string;
}) {
  const bg = { success: 'bg-emerald/10', info: 'bg-blue/10', warning: 'bg-amber/10', accent: 'bg-amber/10', danger: 'bg-rose/10', primary: 'bg-emerald/10' }[color] || 'bg-white/[0.03]';
  const text = { success: 'text-emerald', info: 'text-blue', warning: 'text-amber', accent: 'text-amber', danger: 'text-rose', primary: 'text-emerald' }[color] || 'text-slate-500';
  return (
    <Card className="flex items-center gap-4">
      <div className={`p-3 rounded-xl ${bg}`}><Icon className={`w-6 h-6 ${text}`} /></div>
      <div>
        <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-white">
          {value}{unit && <span className="text-sm font-medium text-label ml-1">{unit}</span>}
        </p>
      </div>
    </Card>
  );
}

function Analytics() {
  const { addToast } = useSystemStore();
  const viewMode = useViewMode();
  const [metrics, setMetrics] = useState<RouteMetrics | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);

  // Outside click handler for date dropdown
  useEffect(() => {
    if (!dateDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setDateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dateDropdownOpen]);

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

      // Check if models are "not_trained" by inspecting response status fields
      const notTrained = [ganRes, agentRes, routeRes].every((r) => {
        if (r.status === 'rejected') return true;
        if (r.status === 'fulfilled' && r.value?.status === 'not_trained') return true;
        return false;
      });
      if (notTrained) setModelsReady(false);

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
    <motion.div
      className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto"
      variants={hyperStaggerContainer}
      initial="hidden"
      animate="show"
    >
      <div className="flex items-center justify-between mb-2">
        <PageHeader title="Analytics" subtitle="Comprehensive system performance metrics and AI model insights" icon={Activity} />
        <div ref={dateRef} className="relative">
          <button
            onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-label hover:text-white transition-all duration-300 flex items-center gap-1.5"
          >
            <Calendar className="w-3 h-3" />
            {dateRange === '7d' ? 'Last 7d' : dateRange === '30d' ? 'Last 30d' : dateRange === '90d' ? '90 days' : 'All time'}
          </button>
          {dateDropdownOpen && (
            <div className="absolute right-0 mt-2 w-40 rounded-xl bg-[#0f141c] border border-white/10 backdrop-blur-[40px] shadow-2xl z-50 py-1">
              {[
                { value: '7d', label: 'Last 7 days' },
                { value: '30d', label: 'Last 30 days' },
                { value: '90d', label: 'Last 90 days' },
                { value: 'all', label: 'All time' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setDateRange(opt.value); setDateDropdownOpen(false); }}
                  className={cn(
                    'w-full px-3 py-2 text-sm text-left transition-colors',
                    dateRange === opt.value
                      ? 'text-emerald bg-emerald/10'
                      : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Not-trained banner ───────────────────────────── */}
      {!modelsReady && !evalLoading && (
        <Card className="mb-6 border-amber/30 bg-amber/5">
          <p className="text-sm text-amber font-medium">Models not trained yet — train the system first to see live evaluation data.</p>
        </Card>
      )}

      {/* ── Key Metrics ──────────────────────────────── */}
      <motion.div variants={hyperStaggerItem} className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8' : 'flex flex-col gap-3 mb-8'}>
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
      </motion.div>

      {/* ── Charts Row 1 ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
        {/* Agent Reward / Energy Timeline (wider) */}
        <Card className="col-span-12 lg:col-span-7 group">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber/10"><Zap className="w-3.5 h-3.5 text-amber" /></div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                {trainingHistory?.reward_history?.length ? 'Agent Reward History' : 'Energy & Distance'}
              </h3>
            </div>

          </div>
          {evalLoading ? (
            <div className="h-[280px] flex items-center justify-center text-label text-sm">Loading…</div>
          ) : trainingHistory?.reward_history?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trainingHistory.reward_history.map((r, i) => ({ episode: r.episode ?? i + 1, reward: r.reward }))}>
                <defs>
                  {areaGradient('gReward', CHART_COLORS.emerald, 0.5, 0)}
                </defs>
                <CartesianGrid {...gridStyle} vertical={false} />
                <XAxis dataKey="episode" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={cursorStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Area type="monotone" dataKey="reward" stroke={CHART_COLORS.emerald} strokeWidth={2.5} fill="url(#gReward)" name="Reward" dot={false} activeDot={{ r: 4, fill: CHART_COLORS.emerald, stroke: '#fff', strokeWidth: 2 }} />
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
                  {areaGradient('gEnergy', CHART_COLORS.amber, 0.5, 0)}
                  {areaGradient('gDistance', CHART_COLORS.cyan, 0.5, 0)}
                </defs>
                <CartesianGrid {...gridStyle} vertical={false} />
                <XAxis dataKey="time" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={cursorStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Area type="monotone" dataKey="energy" stroke={CHART_COLORS.amber} strokeWidth={2.5} fill="url(#gEnergy)" name="Energy (kWh)" dot={false} activeDot={{ r: 4, fill: CHART_COLORS.amber, stroke: '#fff', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="distance" stroke={CHART_COLORS.cyan} strokeWidth={2.5} fill="url(#gDistance)" name="Distance (km)" dot={false} activeDot={{ r: 4, fill: CHART_COLORS.cyan, stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Route Quality Donut (narrower) */}
        <Card className="col-span-12 lg:col-span-5 group">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald/10"><TrendingUp className="w-3.5 h-3.5 text-emerald" /></div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Route Quality</h3>
            </div>

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
                {routeQuality.map((_, idx) => <Cell key={idx} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Charts Row 2 ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* GAN Quality / Distance Distribution */}
        <Card className="group">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue/10"><Route className="w-3.5 h-3.5 text-blue" /></div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                {ganEval ? 'GAN Quality Metrics' : 'Distance Distribution'} <span className="text-label normal-case font-normal">{ganEval ? '' : '(km)'}</span>
              </h3>
            </div>

          </div>
          {evalLoading ? (
            <div className="h-[260px] flex items-center justify-center text-label text-sm">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ganQualityBars}>
                <CartesianGrid {...gridStyle} vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={48} name={ganEval ? 'Value' : 'Routes'}>
                  {ganQualityBars.map((_, idx) => <Cell key={idx} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* GAN Training Convergence */}
        <Card className="group">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber/10"><Cpu className="w-3.5 h-3.5 text-amber" /></div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">GAN Training Loss</h3>
            </div>

          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trainingConvergence}>
              <defs>
                {areaGradient('gDLoss', CHART_COLORS.rose, 0.4, 0)}
                {areaGradient('gGLoss', CHART_COLORS.cyan, 0.4, 0)}
              </defs>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="epoch" tick={axisStyle} axisLine={false} tickLine={false} label={{ value: 'Epoch', position: 'insideBottom', offset: -5, fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={cursorStyle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Area type="monotone" dataKey="dLoss" stroke={CHART_COLORS.rose} strokeWidth={2} fill="url(#gDLoss)" dot={false} activeDot={{ r: 4, fill: CHART_COLORS.rose, stroke: '#fff', strokeWidth: 2 }} name="Discriminator" />
              <Area type="monotone" dataKey="gLoss" stroke={CHART_COLORS.cyan} strokeWidth={2} fill="url(#gGLoss)" dot={false} activeDot={{ r: 4, fill: CHART_COLORS.cyan, stroke: '#fff', strokeWidth: 2 }} name="Generator" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Charts Row 3: Bespoke Widgets ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
        <div className="col-span-12 lg:col-span-4">
          <DemandHeatmap />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <EnergyStackedBar />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <SystemHealthRadar />
        </div>
      </div>

      {/* ── AI Insights Panel ──────────────────────── */}
      <div className="mb-5">
        <AIInsightsPanel />
      </div>

      {/* ── System Info Footer ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card>
          <div className="flex items-center gap-2.5 mb-4">
            <Cpu className="w-4 h-4 text-emerald" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">AI Models</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: 'SG-GAN Traffic',  ready: systemStats?.models?.gan_trained },
              { label: 'Q-Learning Agent', ready: systemStats?.models?.agent_trained },
              { label: 'GNN Route GAN',    ready: systemStats?.models?.gnn_gan_trained },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between p-3 rounded-xl bg-[#0a0f16]/30 border border-white/[0.05]">
                <span className="text-sm font-medium text-label">{m.label}</span>
                {m.ready ? <Badge variant="success" dot>Active</Badge> : <Badge variant="neutral" dot>Inactive</Badge>}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2.5 mb-4">
            <Network className="w-4 h-4 text-emerald" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Network</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Total Nodes', val: systemStats?.road_network?.nodes ?? 0 },
              { label: 'Total Edges', val: systemStats?.road_network?.edges ?? 0 },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-xl bg-[#0a0f16]/30 border border-white/[0.05]">
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-white">{s.val}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2.5 mb-4">
            <Activity className="w-4 h-4 text-emerald" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Performance</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Agent Success Rate', val: agentPerf ? `${(agentPerf.success_rate * 100).toFixed(0)}` : '—', unit: '%' },
              { label: 'Energy Improvement', val: routeEval ? `${(routeEval.energy_improvement * 100).toFixed(1)}` : '—', unit: '%' },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-xl bg-[#0a0f16]/30 border border-white/[0.05]">
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-white">{s.val}{s.unit && <span className="text-sm font-medium text-label ml-1">{s.unit}</span>}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

export default Analytics;
