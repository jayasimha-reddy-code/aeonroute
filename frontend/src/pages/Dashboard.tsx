import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRoadNetwork, useAddToast, useViewMode, useSystemStore, useActivityLog } from '../store/store';
import api from '../services/api';
import { useSystemStats } from '../hooks/useSystemStats';
import NetworkMap from '../components/domain/NetworkMap';
import StatCard from '../components/domain/StatCard';
import PageHeader from '../components/layout/PageHeader';
import TrafficSlider from '../components/domain/dashboard/TrafficSlider';
import { Card, Spinner, ProgressBar, CardHeader } from '../components/ui';
import { StatCardSkeleton } from '../components/ui/Skeleton';
import { ProgressRing } from '../components/ui';
import { BarChart3, Activity, Navigation, Zap, Cpu, Clock, RefreshCw } from 'lucide-react';
import { hyperStaggerContainer, hyperStaggerItem } from '../lib/motion';
import WeatherWidget from '../components/domain/map/WeatherWidget';

/** Format a UTC ISO string (or epoch ms) as a human-readable relative time. */
function formatTimeAgo(isoString: string | null | undefined): string {
  if (!isoString) return 'Never';
  const ms = Date.now() - new Date(isoString).getTime();
  if (isNaN(ms) || ms < 0) return 'Just now';
  if (ms < 60_000) return 'Just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function Dashboard() {
  const roadNetwork = useRoadNetwork();
  const addToast = useAddToast();
  const viewMode = useViewMode();
  const activityLog = useActivityLog();
  
  const { stats, metrics, loading, isRefreshing, error, lastRefresh } = useSystemStats(30000);

  useEffect(() => {
    if (error) {
      addToast({ type: 'error', title: 'Failed to load dashboard', message: error.message });
    }
  }, [error, addToast]);

  useEffect(() => {
    const loadStations = async () => {
      try {
        const stationData = await api.getStations();
        useSystemStore.getState().setStations(stationData.stations);
      } catch { /* stations optional */ }
    };
    loadStations();
  }, []);

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
            <StatCard title="Network Nodes" value={stats?.road_network?.nodes ?? 0} icon={Navigation} accent="emerald" trend={{ value: 5, label: 'this week' }} />
            <StatCard title="Avg Energy" value={`${metrics?.avg_energy_kwh?.toFixed(1) ?? '—'} kWh`} icon={Zap} accent="amber" subtitle="Per route" />
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
            <CardHeader icon={Cpu} title="AI Model Status" accent="emerald" />
            <div className="space-y-3">
              <ModelStatusRow
                label="SG-GAN"
                value={stats?.models?.gan_trained ? 100 : 0}
                displayText={stats?.models?.gan_trained ? 'Trained' : 'Not Trained'}
                color="emerald"
              />
              <ModelStatusRow
                label="Q-Learning"
                value={stats?.models?.agent_trained ? Math.round((stats.models.q_learning_accuracy ?? 0) * 100) : 0}
                color="cyan"
              />
              <ModelStatusRow
                label="GNN"
                value={stats?.models?.gnn_gan_trained ? 100 : 0}
                displayText={stats?.models?.gnn_gan_trained ? 'Trained' : 'Not Trained'}
                color="amber"
              />
            </div>
            <p className="text-xs text-slate-400 mt-4">
              Last Trained: {formatTimeAgo(stats?.models?.last_trained_at)}
            </p>
          </Card>

          {/* Recent Activity */}
          <Card padding="lg" className="flex-1">
            <CardHeader icon={Activity} title="Recent Activity" accent="emerald" />
            {activityLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                <Activity className="w-6 h-6 text-slate-600" />
                <p className="text-xs text-muted">No recent activity</p>
                <p className="text-[11px] text-slate-600">Generate a route or start training to see events</p>
              </div>
            ) : (
              <div className="space-y-1">
                {activityLog.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-lg">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      item.type === 'route' ? 'bg-emerald' : item.type === 'training' ? 'bg-cyan' : 'bg-amber'
                    }`} />
                    <span className="text-slate-300 flex-1">{item.text}</span>
                    <span className="text-slate-500">{formatTimeAgo(new Date(item.timestamp).toISOString())}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </motion.div>

      {/* ── Time-of-Day Traffic Patterns (full width) ── */}
      {stats && (
        <motion.div variants={hyperStaggerItem}>
          <Card>
          <CardHeader icon={Clock} title="Time-of-Day Traffic Patterns" subtitle="SG-GAN learned temporal traffic variation" accent="emerald" />
          <TrafficSlider />
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

/* Helper: Model status row with progress bar (no sparkline — static data) */
function ModelStatusRow({
  label, value, color, displayText,
}: {
  label: string;
  value: number;
  color: 'emerald' | 'cyan' | 'amber';
  displayText?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-300">{label}</span>
      <div className="flex items-center gap-3">
        <div className="w-32">
          <ProgressBar value={value} variant={color} size="sm" />
        </div>
        <span className="text-sm font-medium text-white tabular-nums w-16 text-right">
          {displayText ?? `${value}%`}
        </span>
      </div>
    </div>
  );
}

export default Dashboard;
