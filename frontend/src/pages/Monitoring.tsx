import { motion } from 'framer-motion';
import { Activity, Cpu, HardDrive, Wifi, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, ProgressBar } from '../components/ui';
import { hyperStaggerContainer, hyperStaggerItem } from '../lib/motion';

const services = [
  { name: 'FastAPI Backend', status: 'healthy', uptime: '99.9%', latency: '12ms', icon: Cpu, color: 'emerald' },
  { name: 'Road Network Engine', status: 'healthy', uptime: '99.8%', latency: '45ms', icon: Wifi, color: 'emerald' },
  { name: 'ML Training Pipeline', status: 'idle', uptime: '98.5%', latency: '—', icon: HardDrive, color: 'amber' },
];

const recentEvents = [
  { time: '2m ago', message: 'Route #452 generated successfully', type: 'success' as const },
  { time: '15m ago', message: 'SG-GAN training epoch 30 complete', type: 'success' as const },
  { time: '1h ago', message: 'Battery warning threshold triggered at node 24', type: 'warning' as const },
  { time: '2h ago', message: 'Network graph updated (437 nodes)', type: 'success' as const },
  { time: '3h ago', message: 'Q-Learning agent checkpoint saved', type: 'success' as const },
];

export default function Monitoring() {
  return (
    <motion.div
      className="grid grid-cols-12 gap-4 lg:gap-6"
      variants={hyperStaggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* ── System Health ── */}
      <motion.div className="col-span-12" variants={hyperStaggerItem}>
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">System Health</h3>
              <p className="text-xs text-muted">Service status and performance</p>
            </div>
          </div>
          <div className="space-y-3">
            {services.map((svc) => (
              <div key={svc.name} className="flex items-center gap-4 p-4 rounded-xl bg-[#0a0f16]/30 border border-white/[0.05]">
                <div className={`w-10 h-10 rounded-xl bg-${svc.color}/10 flex items-center justify-center flex-shrink-0`}>
                  <svc.icon className={`w-5 h-5 text-${svc.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{svc.name}</p>
                    <span className={`w-2 h-2 rounded-full ${svc.status === 'healthy' ? 'bg-emerald animate-pulse' : 'bg-amber'}`} />
                  </div>
                  <p className="text-xs text-muted capitalize">{svc.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">Uptime</p>
                  <p className="text-sm font-bold text-white">{svc.uptime}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">Latency</p>
                  <p className="text-sm font-bold text-white">{svc.latency}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* ── Resource Usage ── */}
      <motion.div className="col-span-12 lg:col-span-6" variants={hyperStaggerItem}>
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-cyan/10 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyan" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Resource Usage</h3>
              <p className="text-xs text-muted">Current system utilization</p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: 'CPU Usage', value: 34, color: 'primary' as const },
              { label: 'Memory', value: 62, color: 'primary' as const },
              { label: 'GPU (if available)', value: 0, color: 'primary' as const },
              { label: 'Disk I/O', value: 18, color: 'primary' as const },
            ].map((res) => (
              <div key={res.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-label">{res.label}</span>
                  <span className="text-sm font-bold text-white tabular-nums">{res.value}%</span>
                </div>
                <ProgressBar value={res.value} variant={res.value > 80 ? 'rose' : res.value > 60 ? 'warning' : 'primary'} size="sm" />
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* ── Event Log ── */}
      <motion.div className="col-span-12 lg:col-span-6" variants={hyperStaggerItem}>
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Event Log</h3>
              <p className="text-xs text-muted">Recent system activity</p>
            </div>
          </div>
          <div className="space-y-1">
            {recentEvents.map((event, i) => (
              <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors">
                {event.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300">{event.message}</p>
                </div>
                <span className="text-xs text-slate-500 flex-shrink-0">{event.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
