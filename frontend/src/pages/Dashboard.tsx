import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { useRoadNetwork, useSetActiveTab, useAddToast } from '../store/store';
import api, { SystemStats, RouteMetrics } from '../services/api';
import NetworkMap from '../components/NetworkMap';
import StatCard from '../components/StatCard';
import PageHeader from '../components/PageHeader';
import { Card, Badge, Spinner, GlassCard } from '../components/ui';
import { StatCardSkeleton } from '../components/ui/Skeleton';
import { staggerContainer, staggerItem } from '../lib/motion';
import { BarChart3, Activity, Battery, Navigation, TrendingUp, MapPin, Zap, ArrowRight, Globe, Cpu } from 'lucide-react';

function Dashboard() {
  const roadNetwork = useRoadNetwork();
  const setActiveTab = useSetActiveTab();
  const addToast = useAddToast();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [metrics, setMetrics] = useState<RouteMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const [systemStats, routeMetrics] = await Promise.all([
          api.getSystemStats(),
          api.getRouteMetrics(),
        ]);
        if (mounted) { setStats(systemStats); setMetrics(routeMetrics); }
      } catch (error: any) {
        if (mounted) addToast({ type: 'error', title: 'Failed to load dashboard', message: error?.message });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [addToast]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Dashboard"
        subtitle="Real-time EV routing system status and performance metrics"
        icon={BarChart3}
      />

      {/* ── Key Metrics ─────────────────────────────── */}
      <m.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <m.div variants={staggerItem}><GlassCard variant="interactive" padding="none"><StatCard title="Network Nodes" value={stats?.road_network?.nodes ?? 0} icon={Navigation} color="primary" subtitle="Active intersections" /></GlassCard></m.div>
            <m.div variants={staggerItem}><GlassCard variant="interactive" padding="none"><StatCard title="Road Edges" value={stats?.road_network?.edges ?? 0} icon={Activity} color="accent" subtitle="Connected segments" /></GlassCard></m.div>
            <m.div variants={staggerItem}><GlassCard variant="interactive" padding="none"><StatCard title="Avg Energy" value={`${metrics?.avg_energy_kwh?.toFixed(1) ?? '—'} kWh`} icon={Battery} color="orange" subtitle="Per generated route" /></GlassCard></m.div>
            <m.div variants={staggerItem}><GlassCard variant="interactive" padding="none"><StatCard title="Avg Time" value={`${metrics?.avg_time_minutes?.toFixed(0) ?? '—'} min`} icon={TrendingUp} color="green" subtitle="Per generated route" /></GlassCard></m.div>
          </>
        )}
      </m.div>

      {/* ── Map + Sidebar ───────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Map */}
        <div className="xl:col-span-2">
          <Card className="h-full !p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-500/10">
                  <Globe className="w-4 h-4 text-primary-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Road Network</h3>
                  <p className="text-[11px] text-surface-500">Live topology on dark satellite map</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-surface-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary-500" /> Nodes
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Charging
                </span>
              </div>
            </div>
            <div className="h-[420px]">
              {roadNetwork ? (
                <NetworkMap network={roadNetwork} />
              ) : (
                <div className="h-full flex items-center justify-center bg-surface-50 dark:bg-surface-900/50">
                  <Spinner size="lg" label="Loading network…" />
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* AI Model Status */}
          <Card>
            <div className="flex items-center gap-2.5 mb-5">
              <Cpu className="w-4 h-4 text-primary-500" />
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 uppercase tracking-wider">AI Model Status</h3>
            </div>
            <div className="space-y-2.5">
              {[
                { label: 'SG-GAN Traffic', ready: stats?.models?.gan_trained },
                { label: 'Q-Learning Agent', ready: stats?.models?.agent_trained },
                { label: 'GNN Route GAN', ready: stats?.models?.gnn_gan_trained },
              ].map((model) => (
                <div key={model.label} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-100 dark:border-white/[0.04]">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${model.ready ? 'bg-success-500' : 'bg-surface-400'}`} />
                    <span className="text-sm font-medium text-surface-700 dark:text-surface-300">{model.label}</span>
                  </div>
                  {model.ready ? (
                    <Badge variant="success" dot>Ready</Badge>
                  ) : (
                    <Badge variant="neutral" dot>Not Trained</Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 uppercase tracking-wider mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button onClick={() => setActiveTab('route-planner')} className="btn-primary w-full flex items-center justify-between group">
                <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Plan a Route</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button onClick={() => setActiveTab('training')} className="btn-secondary w-full flex items-center justify-between group">
                <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Train Models</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button onClick={() => setActiveTab('analytics')} className="btn-ghost w-full flex items-center justify-between group">
                <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> View Analytics</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
