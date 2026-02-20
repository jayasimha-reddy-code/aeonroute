import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRoadNetwork, useAddToast, useViewMode, useSystemStore } from '../store/store';
import api, { SystemStats, RouteMetrics } from '../services/api';
import NetworkMap from '../components/NetworkMap';
import StatCard from '../components/StatCard';
import PageHeader from '../components/PageHeader';
import TrafficSlider from '../components/dashboard/TrafficSlider';
import { Card, Spinner, ProgressBar } from '../components/ui';
import { StatCardSkeleton } from '../components/ui/Skeleton';
import { ProgressRing } from '../components/ui';
import { OverflowMenu } from '../components/ui/OverflowMenu';
import { BarChart3, Activity, Navigation, Zap, Cpu, Clock, RefreshCw, ChevronUp } from 'lucide-react';
import { hyperStaggerContainer, hyperStaggerItem } from '../lib/motion';
import { AreaChart, Area, LineChart, Line, ResponsiveContainer } from 'recharts';
import { areaGradient, CHART_COLORS } from '../lib/chartConfig';
import WeatherWidget from '../components/map/WeatherWidget';

function Dashboard() {
  const roadNetwork = useRoadNetwork();
  const addToast = useAddToast();
  const viewMode = useViewMode();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [metrics, setMetrics] = useState<RouteMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async (isInitial = false) => {
    if (!isInitial) setIsRefreshing(true);
    try {
      const [systemStats, routeMetrics] = await Promise.all([
        api.getSystemStats(),
        api.getRouteMetrics(),
      ]);
      setStats(systemStats);
      setMetrics(routeMetrics);
      setLastRefresh(new Date());

      // Load stations on first fetch
      if (isInitial) {
        try {
          const stationData = await api.getStations();
          useSystemStore.getState().setStations(stationData.stations);
        } catch { /* stations optional */ }
      }
    } catch (error: any) {
      if (isInitial) addToast({ type: 'error', title: 'Failed to load dashboard', message: error?.message });
    } finally {
      if (isInitial) setLoading(false);
      setIsRefreshing(false);
    }
  }, [addToast]);

  // Initial load
  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // 30-second auto-refresh (pauses when tab is hidden)
  useEffect(() => {
    const startPolling = () => {
      intervalRef.current = setInterval(() => {
        if (!document.hidden) loadData();
      }, 30000);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      } else {
        loadData(); // refresh immediately on return
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadData]);

  return (
    <motion.div
      className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto"
      variants={hyperStaggerContainer}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={hyperStaggerItem}>
        <PageHeader
          title="Dashboard"
          subtitle="Real-time EV routing system status and performance metrics"
          icon={BarChart3}
        />
      </motion.div>

      {/* ── Auto-refresh indicator ───────────────────── */}
      {lastRefresh && (
        <motion.div variants={hyperStaggerItem} className="flex items-center gap-1.5 mb-4 text-[11px] text-muted">
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Auto-refreshing every 30s · Last: {lastRefresh.toLocaleTimeString()}</span>
        </motion.div>
      )}

      {/* ── Key Metrics ─────────────────────────────── */}
      <motion.div variants={hyperStaggerItem} className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6' : 'flex flex-col gap-3 mb-6'}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Network Nodes" value={stats?.road_network?.nodes ?? 0} icon={Navigation} accent="emerald" trend={{ value: 5, label: 'this week' }}>
              <div className="h-8 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={Array.from({ length: 20 }, (_, i) => ({ v: 300 + i * 8 + Math.sin(i * 0.7) * 20 }))}>
                    <Line type="monotone" dataKey="v" stroke="#10b981" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </StatCard>
            <StatCard title="Avg Energy" value={`${metrics?.avg_energy_kwh?.toFixed(1) ?? '—'} kWh`} icon={Zap} accent="amber" subtitle="Per route">
              <div className="h-8 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={Array.from({ length: 20 }, (_, i) => ({ v: 30 + Math.sin(i * 0.5) * 10 + Math.random() * 5 }))}>
                    <Line type="monotone" dataKey="v" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </StatCard>
            <StatCard title="Avg Time" value={`${metrics?.avg_time_minutes?.toFixed(0) ?? '—'} min`} icon={Clock} accent="cyan" subtitle="Traffic factor" />
            <StatCard title="Traffic Factor" value="" icon={Activity} accent="emerald">
              <ProgressRing value={33} size={56} strokeWidth={4} label="Traffic" />
            </StatCard>
          </>
        )}
      </motion.div>

      {/* ── Map (8 cols) + Info Panel (4 cols) ─────── */}
      <motion.div variants={hyperStaggerItem} className="grid grid-cols-12 gap-4 mb-6" style={{ minHeight: 520 }}>
        {/* Map — 8 columns */}
        <div className="col-span-12 lg:col-span-8">
          <div className="h-full rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative">
            {roadNetwork ? (
              <>
                <NetworkMap network={roadNetwork} />
                <WeatherWidget />
              </>
            ) : (
              <div className="h-full min-h-[420px] flex items-center justify-center bg-midnight/50">
                <Spinner size="lg" label="Loading network…" />
              </div>
            )}
          </div>
        </div>

        {/* Right info panel — 4 columns */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          {/* AI Model Status */}
          <Card padding="lg" className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Cpu className="w-4 h-4 text-emerald" />
                <h3 className="text-sm font-semibold text-white">AI Model Status</h3>
              </div>
              <button className="text-white/30 hover:text-white/60 transition-colors">
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <ModelStatusRow label="SG-GAN" value={stats?.models?.gan_trained ? 78 : 0} color="emerald" />
              <ModelStatusRow label="Q-Learning" value={stats?.models?.agent_trained ? 86 : 0} color="cyan" />
              <ModelStatusRow label="GNN" value={stats?.models?.gnn_gan_trained ? 66 : 0} color="amber" />
            </div>
            <p className="text-xs text-slate-400 mt-4">Last Trained: 2h ago</p>
          </Card>

          {/* Recent Activity */}
          <Card padding="lg" className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
              <OverflowMenu
                items={[
                  { label: 'View All Activity', onClick: () => console.log('View all activity') },
                  { label: 'Export Log', onClick: () => console.log('Export activity log') },
                  { label: 'Clear History', onClick: () => console.log('Clear history'), variant: 'danger' as const },
                ]}
              />
            </div>
            <div className="space-y-1">
              {[
                { id: 1, dot: 'bg-emerald', text: 'Route #452 generated', time: '2m ago' },
                { id: 2, dot: 'bg-emerald', text: 'SG-GAN training complete', time: '1h ago' },
                { id: 3, dot: 'bg-amber', text: 'Battery warning at node 24', time: '3h ago' },
                { id: 4, dot: 'bg-emerald', text: 'Network updated (437 nodes)', time: '5h ago' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => console.log('View activity:', item.id)}
                  className="w-full flex items-center gap-2 text-xs px-3 py-2.5 hover:bg-white/[0.04] cursor-pointer transition-colors duration-200 rounded-lg text-left"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${item.dot} shrink-0`} />
                  <span className="text-slate-300 flex-1">{item.text}</span>
                  <span className="text-slate-500">{item.time}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </motion.div>

      {/* ── Time-of-Day Traffic Patterns (full width) ── */}
      {stats && (
        <motion.div variants={hyperStaggerItem}>
          <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-lg bg-emerald/10">
              <Clock className="w-4 h-4 text-emerald" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                Time-of-Day Traffic Patterns
              </h3>
              <p className="text-[11px] text-muted">SG-GAN learned temporal traffic variation</p>
            </div>
          </div>
          <TrafficSlider />
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

/* Helper: Model status row with progress bar + sparkline */
const sparklineCache: Record<string, { v: number }[]> = {};
function getSparkline(key: string) {
  if (!sparklineCache[key]) {
    sparklineCache[key] = Array.from({ length: 20 }, (_, i) => ({
      v: 60 + Math.sin(i * 0.5 + key.charCodeAt(0)) * 20 + i * 0.8,
    }));
  }
  return sparklineCache[key];
}

function ModelStatusRow({ label, value, color }: { label: string; value: number; color: 'emerald' | 'cyan' | 'amber' }) {
  const colorHex = { emerald: CHART_COLORS.emerald, cyan: CHART_COLORS.cyan, amber: CHART_COLORS.amber }[color];
  const gradId = `spark-${color}`;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-300">{label}</span>
      <div className="flex items-center gap-3">
        {value > 0 && (
          <div className="h-7 w-16">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getSparkline(label)}>
                <defs>{areaGradient(gradId, colorHex, 0.4, 0)}</defs>
                <Area type="monotone" dataKey="v" stroke={colorHex} strokeWidth={1.5} fill={`url(#${gradId})`} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="w-32">
          <ProgressBar value={value} variant={color} size="sm" />
        </div>
        <span className="text-sm font-medium text-white tabular-nums w-10 text-right">{value}%</span>
      </div>
    </div>
  );
}

export default Dashboard;
