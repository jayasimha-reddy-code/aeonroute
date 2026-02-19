import { motion } from 'framer-motion';
import { Brain, Cpu, Network, Activity, CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '../components/ui';
import { staggerContainer, staggerItem } from '../lib/motion';

const models = [
  { name: 'SG-GAN Traffic Generator', version: 'v2.1', status: 'active', accuracy: '94.2%', icon: Brain, color: 'emerald' },
  { name: 'Q-Learning Agent', version: 'v1.8', status: 'active', accuracy: '87.6%', icon: Cpu, color: 'cyan' },
  { name: 'GNN Route Generator', version: 'v1.3', status: 'inactive', accuracy: '—', icon: Network, color: 'amber' },
];

export default function AIModels() {
  return (
    <motion.div
      className="grid grid-cols-12 gap-4 lg:gap-6"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* ── Model Cards ── */}
      {models.map((model) => {
        const isActive = model.status === 'active';
        return (
          <motion.div key={model.name} className="col-span-12 lg:col-span-4" variants={staggerItem}>
            <Card>
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-xl bg-${model.color}/10 flex items-center justify-center`}>
                  <model.icon className={`w-5 h-5 text-${model.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{model.name}</h3>
                  <p className="text-xs text-muted">{model.version}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {isActive ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-500" />
                  )}
                  <span className={`text-xs font-medium ${isActive ? 'text-emerald' : 'text-slate-500'}`}>
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-white/[0.03]">
                  <p className="text-[10px] text-muted uppercase tracking-wider">Model Accuracy</p>
                  <p className="text-lg font-bold text-white mt-0.5">{model.accuracy}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/[0.03]">
                    <p className="text-[10px] text-muted uppercase tracking-wider">Parameters</p>
                    <p className="text-sm font-semibold text-white mt-0.5">1.2M</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03]">
                    <p className="text-[10px] text-muted uppercase tracking-wider">Last Trained</p>
                    <p className="text-sm font-semibold text-white mt-0.5">2h ago</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}

      {/* ── Model Performance Overview ── */}
      <motion.div className="col-span-12" variants={staggerItem}>
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Performance Summary</h3>
              <p className="text-xs text-muted">Aggregate metrics across all active models</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Models', value: '3', unit: '' },
              { label: 'Active', value: '2', unit: '' },
              { label: 'Avg Accuracy', value: '90.9', unit: '%' },
              { label: 'Total Params', value: '3.6', unit: 'M' },
            ].map((stat) => (
              <div key={stat.label} className="p-3 rounded-xl bg-white/[0.03]">
                <p className="text-[10px] text-muted uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-0.5">
                  {stat.value}
                  {stat.unit && <span className="text-sm font-medium text-label ml-1">{stat.unit}</span>}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
