import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSystemStore, useViewMode } from '../store/store';
import { useSystemStats } from '../hooks/useSystemStats';
import { useEvaluationData } from '../hooks/useEvaluationData';
import PageHeader from '../components/layout/PageHeader';
import { Card, Badge, CardHeader } from '../components/ui';
import { StatCardSkeleton } from '../components/ui/Skeleton';
import { cn } from '../lib/utils';
import { hyperStaggerContainer, hyperStaggerItem } from '../lib/motion';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Activity, TrendingUp, Zap, Timer, Route, Gauge, Network, Cpu, Calendar, BarChart3 } from 'lucide-react';
import { tooltipStyle, axisStyle, gridStyle, areaGradient, CHART_COLORS, CHART_PALETTE, cursorStyle } from '../lib/chartConfig';
import SystemHealthRadar from '../components/domain/charts/SystemHealthRadar';
import EnergyStackedBar from '../components/domain/charts/EnergyStackedBar';
import DemandHeatmap from '../components/domain/charts/DemandHeatmap';
import SystemInsightsPanel from '../components/domain/analytics/SystemInsightsPanel';

/* ── Metric Pill ─────────────────────────────────── */
/* ── Empty Chart State ───────────────────────────────── */
function EmptyChartState({
  height, title, message, ctaLabel,
}: {
  height: number;
  title: string;
  message: string;
  ctaLabel?: string;
}) {
  const navigate = useNavigate();
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 text-center"
      style={{ height }}
    >
      <BarChart3 className="w-8 h-8 text-slate-600" />
      <div>
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <p className="text-xs text-muted mt-1">{message}</p>
      </div>
      {ctaLabel && (
        <button
          onClick={() => navigate('/training')}
          className="mt-1 px-3 py-1.5 text-xs rounded-lg bg-emerald/10 text-emerald border border-emerald/20 hover:bg-emerald/20 transition-all"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

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
  const [dateRange, setDateRange] = useState('7d');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);

  const { stats: systemStats, metrics, loading: statsLoading, error: statsError } = useSystemStats();
  const { ganEval, agentPerf, routeEval, trainingHistory, loading: evalLoading, error: evalError, modelsReady } = useEvaluationData();
  const loading = statsLoading || evalLoading;

  useEffect(() => {
    if (statsError) addToast({ type: 'error', title: 'Analytics failed', message: statsError.message });
    if (evalError) addToast({ type: 'error', title: 'Evaluation failed', message: evalError.message });
  }, [statsError, evalError, addToast]);

  /* ── Derive chart data from live results ──────────── */
  const trainingConvergence = trainingHistory?.loss_history?.length
    ? trainingHistory.loss_history.map((h) => ({ epoch: h.epoch, dLoss: h.d_loss_real, gLoss: h.g_loss }))
    : null; // no mock fallback — show empty state

  const routeQuality = routeEval
    ? [
        { name: 'Feasible', value: Math.round((routeEval.avg_feasibility_rate ?? 0) * 100) },
        { name: 'Infeasible', value: Math.round((1 - (routeEval.avg_feasibility_rate ?? 0)) * 100) },
      ]
    : null; // no mock fallback

  const ganQualityBars = ganEval
    ? [
        { label: 'Hourly Corr', value: +(ganEval.hourly_correlation ?? 0).toFixed(2) },
        { label: 'Morning Peak', value: +(ganEval.morning_peak_ratio ?? 0).toFixed(2) },
        { label: 'Evening Peak', value: +(ganEval.evening_peak_ratio ?? 0).toFixed(2) },
        { label: 'Night Ratio', value: +(ganEval.night_ratio ?? 0).toFixed(2) },
      ]
    : null; // no mock fallback

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
          <CardHeader icon={Zap} title={trainingHistory?.reward_history?.length ? 'Agent Reward History' : 'Energy & Distance'} accent="amber" />
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
            <EmptyChartState
              height={280}
              title="No agent data yet"
              message="Train the system to see reward history and energy patterns"
              ctaLabel="Start Training"
            />
          )}
        </Card>

        {/* Route Quality Donut (narrower) */}
        <Card className="col-span-12 lg:col-span-5 group">
          <CardHeader icon={TrendingUp} title="Route Quality" accent="emerald" />
          {routeQuality ? (
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
          ) : (
            <EmptyChartState
              height={280}
              title="No route evaluation data"
              message="Generate routes after training to see feasibility breakdown"
            />
          )}
        </Card>
      </div>

      {/* ── Charts Row 2 ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* GAN Quality / Distance Distribution */}
        <Card className="group">
          <CardHeader icon={Route} title="GAN Quality Metrics" accent="blue" />
          {evalLoading ? (
            <div className="h-[260px] flex items-center justify-center text-label text-sm">Loading…</div>
          ) : ganQualityBars ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ganQualityBars}>
                <CartesianGrid {...gridStyle} vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={48} name="Value">
                  {ganQualityBars.map((_, idx) => <Cell key={idx} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartState
              height={260}
              title="No GAN evaluation data"
              message="Train the GAN to see traffic quality metrics"
              ctaLabel="Start Training"
            />
          )}
        </Card>

        {/* GAN Training Convergence */}
        <Card className="group">
          <CardHeader icon={Cpu} title="GAN Training Loss" accent="amber" />
          {trainingConvergence ? (
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
          ) : (
            <EmptyChartState
              height={260}
              title="No training history"
              message="Train the GAN to see discriminator and generator loss curves"
              ctaLabel="Start Training"
            />
          )}
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

      {/* ── System Insights Panel ──────────────────────── */}
      <div className="mb-5">
        <SystemInsightsPanel />
      </div>

      {/* ── System Info Footer ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card>
          <CardHeader icon={Cpu} title="System Models" accent="emerald" />
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
          <CardHeader icon={Network} title="Network" accent="emerald" />
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
          <CardHeader icon={Activity} title="Performance" accent="emerald" />
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
