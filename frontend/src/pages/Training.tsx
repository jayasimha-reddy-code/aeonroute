import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { hyperStaggerContainer, hyperStaggerItem } from '../lib/motion';
import api, { type SystemHealth } from '../services/api';
import PageHeader from '../components/PageHeader';
import { Card, Button, Badge, ProgressBar } from '../components/ui';
import { useSystemStore, useTrainingProgress, useRewardHistory, useSSEConnected, useResetTrainingData, useSetActiveTab, useTrainingLogs, useSimulationScale } from '../store/store';
import { useTrainingStream } from '../hooks/useTrainingStream';
import { RewardCurveChart } from '../components/training/RewardCurveChart';
import { HardwareGauge } from '../components/training/HardwareGauge';
import { LiveTerminal } from '../components/training/LiveTerminal';
import { PipelineFlowchart } from '../components/training/PipelineFlowchart';
import { NeonSlider } from '../components/ui/NeonSlider';
import { Brain, Play, Square, CheckCircle, Circle, Loader2, Settings2, Workflow, BarChart3, TrendingUp, Navigation, Cpu } from 'lucide-react';
import { cn } from '../lib/utils';

const SCALE_EPISODES: Record<string, number> = { light: 50, standard: 200, full: 500 };

function Training() {
  const { addToast } = useSystemStore();

  const trainingProgress = useTrainingProgress();
  const rewardHistory = useRewardHistory();
  const sseConnected = useSSEConnected();
  const resetTrainingData = useResetTrainingData();
  const setActiveTab = useSetActiveTab();
  const trainingLogs = useTrainingLogs();
  const simulationScale = useSimulationScale();

  const [config, setConfig] = useState({
    episodes: 200, learning_rate: 0.1, discount_factor: 0.95,
    max_steps: 300,
  });
  const [userOverrodeEpisodes, setUserOverrodeEpisodes] = useState(false);

  // Pre-populate episode count from simulationScale (only when not user-overridden)
  useEffect(() => {
    if (!userOverrodeEpisodes) {
      setConfig((c) => ({ ...c, episodes: SCALE_EPISODES[simulationScale] ?? 200 }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationScale]);
  const [hardwareType, setHardwareType] = useState<'GPU' | 'TPU'>('GPU');

  // Real system metrics (CPU / memory) from /api/system-health
  const [sysHealth, setSysHealth] = useState<SystemHealth | null>(null);
  useEffect(() => {
    let cancelled = false;
    const fetchHealth = async () => {
      try {
        const health = await api.getSystemHealth();
        if (!cancelled) setSysHealth(health);
      } catch { /* backend may not have psutil — gauges show 0 */ }
    };
    fetchHealth();
    // Poll every 5 s while training is active, every 30 s otherwise
    const interval = setInterval(fetchHealth, trainingProgress.is_training ? 5000 : 30000);
    return () => { cancelled = true; clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingProgress.is_training]);

  // ETA tracking
  const epochStartRef = useRef<number | null>(null);
  const [etaText, setEtaText] = useState<string>('');

  // Detect GPU availability
  const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
  const detectedDevice = hasWebGPU ? 'GPU (WebGPU)' : 'CPU';

  // Compute ETA from episode progress
  useEffect(() => {
    if (!trainingProgress.is_training) {
      if (trainingProgress.progress >= 100) setEtaText('Complete');
      else setEtaText('');
      epochStartRef.current = null;
      return;
    }
    const ep = trainingProgress.rl_episode;
    const total = trainingProgress.rl_total_episodes;
    if (ep > 0 && total > 0) {
      if (!epochStartRef.current) epochStartRef.current = performance.now();
      if (ep >= 3) {
        const elapsed = (performance.now() - epochStartRef.current) / 1000;
        const avgPerEp = elapsed / ep;
        const remaining = (total - ep) * avgPerEp;
        const mins = Math.floor(remaining / 60);
        const secs = Math.round(remaining % 60);
        setEtaText(mins > 0 ? `~${mins}m ${secs}s` : `~${secs}s`);
      } else {
        setEtaText('Calculating…');
      }
    }
  }, [trainingProgress.rl_episode, trainingProgress.rl_total_episodes, trainingProgress.is_training, trainingProgress.progress]);

  // Format trainingLogs for LiveTerminal
  const formattedLogs = trainingLogs.map(
    (entry) => `[${entry.timestamp}] ${entry.message}`
  );

  // Connect SSE stream when training is active
  useTrainingStream(trainingProgress.is_training);

  // Polling fallback when SSE disconnected but training active
  useEffect(() => {
    if (!sseConnected && trainingProgress.is_training) {
      const pollInterval = setInterval(async () => {
        try {
          const status = await api.getTrainingStatus();
          useSystemStore.getState().updateTrainingFromSSE(status);
        } catch { /* retry silently */ }
      }, 3000);
      return () => clearInterval(pollInterval);
    }
  }, [sseConnected, trainingProgress.is_training]);

  const handleStart = async () => {
    try {
      // Reset stale data first, then optimistically set is_training=true so the
      // SSE hook opens its EventSource *before* the server response arrives.
      resetTrainingData();
      useSystemStore.getState().updateTrainingFromSSE({ is_training: true, current_step: 'Starting…' });
      await api.startTraining(config);
      addToast({ type: 'info', title: 'Training Started', message: 'Q-Learning pipeline kicked off.' });
    } catch (error: any) {
      // Rollback optimistic update on failure
      useSystemStore.getState().updateTrainingFromSSE({ is_training: false, current_step: '' });
      const msg = (error?.response?.status === 409)
        ? 'Training is already in progress.'
        : (error?.message ?? 'Unknown error');
      addToast({ type: 'error', title: 'Failed to Start', message: msg });
    }
  };

  const handleStop = async () => {
    try {
      await api.stopTraining();
      addToast({ type: 'warning', title: 'Training Stopped' });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Failed to Stop', message: error?.message });
    }
  };

  return (
    <motion.div
      className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto"
      variants={hyperStaggerContainer}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={hyperStaggerItem}>
        <PageHeader
          title="Model Training"
          subtitle="Configure and train the complete EV routing AI pipeline"
          icon={Brain}
          actions={
            <>
              {trainingProgress.is_training && (
                <div className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full', sseConnected ? 'bg-emerald' : 'bg-rose')} />
                  <Badge variant="success" dot>Training in Progress</Badge>
                </div>
              )}
              {!trainingProgress.is_training && trainingProgress.progress >= 100 && (
                <Badge variant="primary" dot>Complete</Badge>
              )}
            </>
          }
        />
      </motion.div>

      <motion.div variants={hyperStaggerItem} className="grid grid-cols-12 gap-6">
        {/* ═══ LEFT COLUMN: Configuration + Hardware ═══ */}
        <div className="col-span-12 lg:col-span-3 space-y-5">
          {/* Configuration Card — Neon Sliders */}
          <Card className="sticky top-20">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-1.5 rounded-lg bg-emerald-dim"><Settings2 className="w-3.5 h-3.5 text-emerald" /></div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Configuration</h3>
            </div>

            <div className="space-y-4">
              <NeonSlider
                label="Episodes" icon="🎯" value={config.episodes}
                onChange={(v) => { setConfig({ ...config, episodes: v }); setUserOverrodeEpisodes(true); }}
                min={50} max={1000} step={10}
                disabled={trainingProgress.is_training}
              />
              <p className="text-[10px] text-slate-500 -mt-2">
                Recommended: <span className="text-cyan-400">{SCALE_EPISODES[simulationScale] ?? 200} episodes</span> for your hardware
              </p>
              <NeonSlider
                label="Learning Rate" icon="📈" value={config.learning_rate}
                onChange={(v) => setConfig({ ...config, learning_rate: v })}
                min={0.01} max={1.0} step={0.01}
                disabled={trainingProgress.is_training}
              />
              <NeonSlider
                label="Discount Factor" icon="⚖️" value={config.discount_factor}
                onChange={(v) => setConfig({ ...config, discount_factor: v })}
                min={0.5} max={0.99} step={0.01}
                disabled={trainingProgress.is_training}
              />
              <NeonSlider
                label="Max Steps/Episode" icon="👣" value={config.max_steps}
                onChange={(v) => setConfig({ ...config, max_steps: v })}
                min={50} max={1000} step={10}
                disabled={trainingProgress.is_training}
              />
            </div>

            <div className="divider my-5" />

            {!trainingProgress.is_training ? (
              <Button variant="primary" fullWidth icon={Play} onClick={handleStart}>Start Training</Button>
            ) : (
              <Button variant="danger" fullWidth icon={Square} onClick={handleStop}>Stop Training</Button>
            )}

            {/* ── Hardware Gauges ── */}
            {/* ── Hardware Recommendations ── */}
            <div className="divider my-5" />
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-cyan-500/10"><Cpu className="w-3.5 h-3.5 text-cyan-400" /></div>
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Hardware Recommendations</h3>
            </div>
            <div className="mb-3 text-[10px] text-slate-400">
              Detected: <span className="text-white font-medium">{detectedDevice}</span>
            </div>
            <div className="rounded-xl overflow-hidden border border-white/[0.06] text-[10px] mb-3">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-3 py-2 text-slate-500">Setting</th>
                    <th className={cn('px-3 py-2', !hasWebGPU ? 'text-emerald bg-emerald/5' : 'text-slate-500')}>CPU</th>
                    <th className={cn('px-3 py-2', hasWebGPU ? 'text-emerald bg-emerald/5' : 'text-slate-500')}>GPU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {[
                    ['Episodes', '200', '1000'],
                    ['Batch Size', '32', '128'],
                    ['Learning Rate', '0.1', '0.01'],
                    ['Max Steps', '300', '1000'],
                  ].map(([label, cpu, gpu]) => (
                    <tr key={label}>
                      <td className="px-3 py-1.5 text-slate-400">{label}</td>
                      <td className={cn('px-3 py-1.5 text-center', !hasWebGPU ? 'text-emerald font-medium' : 'text-slate-500')}>{cpu}</td>
                      <td className={cn('px-3 py-1.5 text-center', hasWebGPU ? 'text-emerald font-medium' : 'text-slate-500')}>{gpu}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-[10px] text-center text-muted">
              {trainingProgress.is_training
                ? etaText ? <span className="text-emerald">ETA: {etaText}</span> : 'Calculating ETA…'
                : 'Start training to see ETA estimates.'}
            </div>

            <div className="divider my-5" />
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-white uppercase tracking-wider">Hardware</span>
              <div className="flex rounded-lg bg-white/[0.04] border border-white/[0.06] overflow-hidden">
                {(['GPU', 'TPU'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setHardwareType(t)}
                    className={cn(
                      'px-3 py-1 text-[10px] font-medium transition-colors',
                      hardwareType === t ? 'bg-emerald/20 text-emerald' : 'text-slate-500 hover:text-slate-300',
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-center gap-6">
              <HardwareGauge
                label="CPU"
                value={sysHealth?.cpu_percent ?? 0}
                max={100}
                unit="%"
                color="#f59e0b"
                size={100}
              />
              <HardwareGauge
                label="RAM"
                value={sysHealth?.memory_percent ?? 0}
                max={100}
                unit="%"
                color="#10b981"
                size={100}
              />
            </div>
          </Card>
        </div>

        {/* ═══ RIGHT COLUMN: Pipeline + Progress + Terminal ═══ */}
        <div className="col-span-12 lg:col-span-9 space-y-5">
          {/* Overall Progress */}
          <Card>
            <div className="flex items-center gap-3 mb-5">
              {trainingProgress.is_training ? (
                <div className="p-2 rounded-xl bg-emerald/10"><Loader2 className="w-5 h-5 text-emerald animate-spin" /></div>
              ) : trainingProgress.progress >= 100 ? (
                <div className="p-2 rounded-xl bg-emerald/10"><CheckCircle className="w-5 h-5 text-emerald" /></div>
              ) : (
                <div className="p-2 rounded-xl bg-[#0a0f16]/30"><Circle className="w-5 h-5 text-slate-500" /></div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {trainingProgress.is_training ? 'Training in Progress' : trainingProgress.progress >= 100 ? 'Training Complete' : 'Ready to Train'}
                </h3>
                <p className="text-[11px] text-muted">{trainingProgress.current_step || 'Waiting to start…'}</p>
              </div>
            </div>
            <ProgressBar value={trainingProgress.progress} variant="gradient" size="lg" showValue label="Overall Progress" />
            {/* Episode counter */}
            {(trainingProgress.is_training || trainingProgress.rl_episode > 0) && (
              <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
                <span>Episode {trainingProgress.rl_episode} / {trainingProgress.rl_total_episodes || config.episodes}</span>
                {etaText && <span className="text-emerald">ETA: {etaText}</span>}
              </div>
            )}
          </Card>

          {/* Training Pipeline — Node-Based Flowchart */}
          <Card>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-1.5 rounded-lg bg-amber-dim"><Workflow className="w-3.5 h-3.5 text-amber" /></div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Training Pipeline</h3>
            </div>
            <PipelineFlowchart
              progress={trainingProgress.progress}
              isTraining={trainingProgress.is_training}
              currentStep={trainingProgress.current_step}
            />
          </Card>

          {/* Q-Learning Reward */}
          {(rewardHistory.length > 0 || trainingProgress.current_step.toLowerCase().includes('agent') || trainingProgress.current_step.toLowerCase().includes('training') || trainingProgress.current_step.toLowerCase().includes('q-learning')) && (
            <Card>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-1.5 rounded-lg bg-emerald-dim"><TrendingUp className="w-3.5 h-3.5 text-emerald" /></div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Q-Learning Reward</h3>
              </div>
              <RewardCurveChart data={rewardHistory} rlEpisode={trainingProgress.rl_episode} rlTotalEpisodes={trainingProgress.rl_total_episodes} />
            </Card>
          )}

          {/* Results */}
          {trainingProgress.metrics && Object.keys(trainingProgress.metrics).length > 0 && (
            <Card>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-1.5 rounded-lg bg-amber-500/10"><BarChart3 className="w-3.5 h-3.5 text-amber-500" /></div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Training Results</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(trainingProgress.metrics).map(([key, value]) => (
                  <div key={key} className="p-3 rounded-xl bg-[#0a0f16]/30 border border-white/[0.05]">
                    <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{key.replace(/_/g, ' ')}</p>
                    <p className="text-lg font-bold text-white">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Post-training success */}
              {!trainingProgress.is_training && trainingProgress.progress >= 100 && (
                <div className="mt-4 pt-4 border-t border-white/[0.05]">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-emerald" />
                    <span className="text-sm text-emerald font-medium">Q-table saved — routes now use AI optimization</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('routing')}
                    className="px-4 py-2 rounded-xl bg-emerald/20 text-emerald text-sm font-medium hover:bg-emerald/30 transition-colors flex items-center gap-2"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Test Route
                  </button>
                </div>
              )}
            </Card>
          )}

          {/* Real-time Logs — Terminal */}
          <LiveTerminal
            logs={formattedLogs}
            sseConnected={sseConnected}
            isTraining={trainingProgress.is_training}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

export default Training;
