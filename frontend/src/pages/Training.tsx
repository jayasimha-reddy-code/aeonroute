import { useState, useEffect } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import { Card, Button, Badge, ProgressBar } from '../components/ui';
import { useSystemStore, useTrainingProgress, useLossHistory, useRewardHistory, useSSEConnected, useResetTrainingData } from '../store/store';
import { useTrainingStream } from '../hooks/useTrainingStream';
import { LossCurveChart } from '../components/training/LossCurveChart';
import { RewardCurveChart } from '../components/training/RewardCurveChart';
import { PipelineStepper } from '../components/training/PipelineStepper';
import { Brain, Play, Square, CheckCircle, Circle, Loader2, Settings2, Workflow, BarChart3, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';

function Training() {
  const { addToast } = useSystemStore();

  const trainingProgress = useTrainingProgress();
  const lossHistory = useLossHistory();
  const rewardHistory = useRewardHistory();
  const sseConnected = useSSEConnected();
  const resetTrainingData = useResetTrainingData();

  const [config, setConfig] = useState({
    grid_size: 10, gan_epochs: 100, rl_episodes: 500,
    traffic_samples: 500, gan_batch_size: 32, rl_max_steps: 200,
  });

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
      await api.startTraining(config);
      resetTrainingData();
      addToast({ type: 'info', title: 'Training Started', message: 'Pipeline kicked off.' });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Failed to Start', message: error?.message });
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

  const configFields = [
    { key: 'grid_size',       label: 'Grid Size',          min: 5,   max: 20,   icon: '🗺️' },
    { key: 'gan_epochs',      label: 'GAN Epochs',         min: 10,  max: 500,  icon: '🧠' },
    { key: 'rl_episodes',     label: 'RL Episodes',        min: 100, max: 1000, icon: '🎯' },
    { key: 'traffic_samples', label: 'Traffic Samples',    min: 100, max: 2000, icon: '🚗' },
    { key: 'gan_batch_size',  label: 'Batch Size',         min: 4,   max: 128,  icon: '📦' },
    { key: 'rl_max_steps',    label: 'Max Steps/Episode',  min: 50,  max: 500,  icon: '👣' },
  ] as const;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
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

      <div className="grid grid-cols-12 gap-6">
        {/* ── Config Panel ──────────────────────────────── */}
        <div className="col-span-12 lg:col-span-3">
          <Card className="sticky top-20">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-1.5 rounded-lg bg-emerald-dim"><Settings2 className="w-3.5 h-3.5 text-emerald" /></div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Configuration</h3>
            </div>

            <div className="space-y-3">
              {configFields.map(({ key, label, min, max, icon }) => (
                <div key={key}>
                  <label className="input-label flex items-center gap-1.5">
                    <span className="text-xs">{icon}</span> {label}
                  </label>
                  <input
                    type="number" min={min} max={max}
                    value={config[key]}
                    onChange={(e) => setConfig({ ...config, [key]: parseInt(e.target.value) || min })}
                    disabled={trainingProgress.is_training}
                    className="input-field disabled:opacity-40"
                  />
                </div>
              ))}
            </div>

            <div className="divider my-5" />

            {!trainingProgress.is_training ? (
              <Button variant="primary" fullWidth icon={Play} onClick={handleStart}>Start Training</Button>
            ) : (
              <Button variant="danger" fullWidth icon={Square} onClick={handleStop}>Stop Training</Button>
            )}
          </Card>
        </div>

        {/* ── Progress Panel ────────────────────────────── */}
        <div className="col-span-12 lg:col-span-9 space-y-5">
          {/* Overall Progress */}
          <Card>
            <div className="flex items-center gap-3 mb-5">
              {trainingProgress.is_training ? (
                <div className="p-2 rounded-xl bg-emerald/10"><Loader2 className="w-5 h-5 text-emerald animate-spin" /></div>
              ) : trainingProgress.progress >= 100 ? (
                <div className="p-2 rounded-xl bg-emerald/10"><CheckCircle className="w-5 h-5 text-emerald" /></div>
              ) : (
                <div className="p-2 rounded-xl bg-white/[0.03]"><Circle className="w-5 h-5 text-slate-500" /></div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {trainingProgress.is_training ? 'Training in Progress' : trainingProgress.progress >= 100 ? 'Training Complete' : 'Ready to Train'}
                </h3>
                <p className="text-[11px] text-muted">{trainingProgress.current_step || 'Waiting to start…'}</p>
              </div>
            </div>

            <ProgressBar value={trainingProgress.progress} variant="gradient" size="lg" showValue label="Overall Progress" />
          </Card>

          {/* Pipeline Timeline */}
          <Card>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-1.5 rounded-lg bg-amber-dim"><Workflow className="w-3.5 h-3.5 text-amber" /></div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Training Pipeline</h3>
            </div>

            <PipelineStepper
              progress={trainingProgress.progress}
              isTraining={trainingProgress.is_training}
              currentStep={trainingProgress.current_step}
              ganEpoch={trainingProgress.gan_epoch}
              ganTotalEpochs={trainingProgress.gan_total_epochs}
              rlEpisode={trainingProgress.rl_episode}
              rlTotalEpisodes={trainingProgress.rl_total_episodes}
            />
          </Card>

          {/* GAN Loss Curves */}
          {(lossHistory.length > 0 || trainingProgress.current_step.toLowerCase().includes('gan')) && (
            <div>
              <Card>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-1.5 rounded-lg bg-amber-500/10"><BarChart3 className="w-3.5 h-3.5 text-amber-500" /></div>
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider">GAN Loss Curves</h3>
                </div>
                <LossCurveChart data={lossHistory} ganEpoch={trainingProgress.gan_epoch} ganTotalEpochs={trainingProgress.gan_total_epochs} />
              </Card>
            </div>
          )}

          {/* Q-Learning Reward */}
          {(rewardHistory.length > 0 || trainingProgress.current_step.toLowerCase().includes('agent')) && (
            <div>
              <Card>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-1.5 rounded-lg bg-emerald-dim"><TrendingUp className="w-3.5 h-3.5 text-emerald" /></div>
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Q-Learning Reward</h3>
                </div>
                <RewardCurveChart data={rewardHistory} rlEpisode={trainingProgress.rl_episode} rlTotalEpisodes={trainingProgress.rl_total_episodes} />
              </Card>
            </div>
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
                  <div key={key} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{key.replace(/_/g, ' ')}</p>
                    <p className="text-lg font-bold text-white">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default Training;
