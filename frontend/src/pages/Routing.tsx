import { motion } from 'framer-motion';
import { Target, Route, Gauge, Timer, Zap, TrendingUp } from 'lucide-react';
import { Card } from '../components/ui';
import { staggerContainer, staggerItem } from '../lib/motion';

const routingAlgorithms = [
  { name: 'Q-Learning Agent', type: 'Reinforcement Learning', status: 'Primary', color: 'emerald' },
  { name: 'GNN Route Generator', type: 'Graph Neural Network', status: 'Secondary', color: 'cyan' },
  { name: 'Dijkstra Baseline', type: 'Classical', status: 'Fallback', color: 'amber' },
];

export default function RoutingConfig() {
  return (
    <motion.div
      className="grid grid-cols-12 gap-4 lg:gap-6"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* ── Routing Algorithms ── */}
      <motion.div className="col-span-12 lg:col-span-7" variants={staggerItem}>
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-emerald" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Routing Algorithms</h3>
              <p className="text-xs text-muted">Active routing strategies and priorities</p>
            </div>
          </div>
          <div className="space-y-3">
            {routingAlgorithms.map((algo) => (
              <div key={algo.name} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-8 rounded-full bg-${algo.color}`} />
                  <div>
                    <p className="text-sm font-medium text-white">{algo.name}</p>
                    <p className="text-xs text-muted">{algo.type}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-lg bg-${algo.color}/10 text-${algo.color}`}>
                  {algo.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* ── Routing Metrics ── */}
      <motion.div className="col-span-12 lg:col-span-5" variants={staggerItem}>
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-cyan/10 flex items-center justify-center">
              <Gauge className="w-5 h-5 text-cyan" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Routing Metrics</h3>
              <p className="text-xs text-muted">Current performance indicators</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { icon: Route, label: 'Avg Route Length', value: '14.2', unit: 'km', color: 'text-emerald' },
              { icon: Timer, label: 'Avg Compute Time', value: '120', unit: 'ms', color: 'text-cyan' },
              { icon: Zap, label: 'Avg Energy Cost', value: '8.4', unit: 'kWh', color: 'text-amber' },
              { icon: TrendingUp, label: 'Feasibility Rate', value: '94', unit: '%', color: 'text-emerald' },
            ].map((metric) => (
              <div key={metric.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
                <metric.icon className={`w-4 h-4 ${metric.color} flex-shrink-0`} />
                <span className="text-sm text-label flex-1">{metric.label}</span>
                <span className="text-sm font-bold text-white tabular-nums">
                  {metric.value}
                  <span className="text-xs font-medium text-muted ml-1">{metric.unit}</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* ── Configuration ── */}
      <motion.div className="col-span-12" variants={staggerItem}>
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center">
              <Route className="w-5 h-5 text-amber" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Route Generation Config</h3>
              <p className="text-xs text-muted">Parameters for route optimization</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Max Candidates', value: '5' },
              { label: 'Energy Weight', value: '0.4' },
              { label: 'Time Weight', value: '0.3' },
              { label: 'Distance Weight', value: '0.3' },
            ].map((param) => (
              <div key={param.label} className="p-3 rounded-xl bg-white/[0.03]">
                <p className="text-[10px] text-muted uppercase tracking-wider">{param.label}</p>
                <p className="text-xl font-bold text-white mt-0.5">{param.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
