import { useState, useEffect, useRef } from 'react';
import api, { TrainingStatus } from '../services/api';
import PageHeader from '../components/PageHeader';
import { Card, Button, Badge, ProgressBar } from '../components/ui';
import { useSystemStore } from '../store/store';
import { Brain, Play, Square, CheckCircle, Circle, Loader2, Settings2, Workflow, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';

const PIPELINE_STEPS = [
  { name: 'Road Network',       desc: 'Building graph topology',      threshold: 10 },
  { name: 'Traffic Generation',  desc: 'Sampling synthetic patterns',  threshold: 25 },
  { name: 'GAN Training',        desc: 'Training SG-GAN generator',    threshold: 40 },
  { name: 'RL Environment',      desc: 'Initializing MDP',             threshold: 55 },
  { name: 'Agent Training',      desc: 'Q-learning episodes',          threshold: 75 },
  { name: 'Route Generator',     desc: 'GNN-GAN route generation',     threshold: 85 },
  { name: 'System Evaluation',   desc: 'Benchmark & metrics',          threshold: 95 },
];

function Training() {
  const { addToast } = useSystemStore();

  const [config, setConfig] = useState({
    grid_size: 10, gan_epochs: 100, rl_episodes: 500,
    traffic_samples: 500, gan_batch_size: 32, rl_max_steps: 200,
  });

  const [training, setTraining] = useState<TrainingStatus>({
    is_training: false, progress: 0, current_step: '', metrics: {},
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (training.is_training) {
      intervalRef.current = setInterval(async () => {
        try {
          const status = await api.getTrainingStatus();
          setTraining(status);
          if (!status.is_training && status.progress >= 100)
            addToast({ type: 'success', title: 'Training Complete', message: 'All models trained successfully.' });
        } catch { /* retry silently */ }
      }, 2000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [training.is_training, addToast]);

  const handleStart = async () => {
    try {
      await api.startTraining(config);
      setTraining({ is_training: true, progress: 0, current_step: 'Initializing…', metrics: {} });
      addToast({ type: 'info', title: 'Training Started', message: 'Pipeline kicked off.' });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Failed to Start', message: error?.message });
    }
  };

  const handleStop = async () => {
    try {
      await api.stopTraining();
      setTraining((s) => ({ ...s, is_training: false }));
      if (intervalRef.current) clearInterval(intervalRef.current);
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
          training.is_training
            ? <Badge variant="success" dot>Training in Progress</Badge>
            : training.progress >= 100
              ? <Badge variant="primary" dot>Complete</Badge>
              : null
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Config Panel ──────────────────────────────── */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-1.5 rounded-lg bg-primary-500/10"><Settings2 className="w-3.5 h-3.5 text-primary-500" /></div>
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 uppercase tracking-wider">Configuration</h3>
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
                    disabled={training.is_training}
                    className="input-field disabled:opacity-40"
                  />
                </div>
              ))}
            </div>

            <div className="divider my-5" />

            {!training.is_training ? (
              <Button variant="primary" fullWidth icon={Play} onClick={handleStart}>Start Training</Button>
            ) : (
              <Button variant="danger" fullWidth icon={Square} onClick={handleStop}>Stop Training</Button>
            )}
          </Card>
        </div>

        {/* ── Progress Panel ────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Overall Progress */}
          <Card>
            <div className="flex items-center gap-3 mb-5">
              {training.is_training ? (
                <div className="p-2 rounded-xl bg-primary-500/10"><Loader2 className="w-5 h-5 text-primary-500 animate-spin" /></div>
              ) : training.progress >= 100 ? (
                <div className="p-2 rounded-xl bg-success-500/10"><CheckCircle className="w-5 h-5 text-success-500" /></div>
              ) : (
                <div className="p-2 rounded-xl bg-surface-100 dark:bg-surface-800"><Circle className="w-5 h-5 text-surface-400" /></div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                  {training.is_training ? 'Training in Progress' : training.progress >= 100 ? 'Training Complete' : 'Ready to Train'}
                </h3>
                <p className="text-[11px] text-surface-500">{training.current_step || 'Waiting to start…'}</p>
              </div>
            </div>

            <ProgressBar value={training.progress} variant="gradient" size="lg" showValue label="Overall Progress" />
          </Card>

          {/* Pipeline Timeline */}
          <Card>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-1.5 rounded-lg bg-accent-500/10"><Workflow className="w-3.5 h-3.5 text-accent-500" /></div>
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 uppercase tracking-wider">Training Pipeline</h3>
            </div>

            <div className="relative">
              {/* Vertical connector line in gutter */}
              <div className="absolute left-[17px] top-4 bottom-4 w-px bg-surface-200 dark:bg-surface-700/50" />

              <div className="space-y-0.5">
                {PIPELINE_STEPS.map((step, idx) => {
                  const isDone = training.progress >= step.threshold;
                  const isCurrent = training.is_training && !isDone && (idx === 0 || training.progress >= PIPELINE_STEPS[idx - 1].threshold);

                  return (
                    <div key={idx} className={cn(
                      'relative flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all',
                      isCurrent && 'bg-primary-500/5 dark:bg-primary-500/[0.08]',
                    )}>
                      <div className={cn(
                        'relative z-10 w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0 transition-all border-2',
                        isDone ? 'bg-success-500/10 border-success-500/30 text-success-500'
                          : isCurrent ? 'bg-primary-500/10 border-primary-500/30 text-primary-500'
                            : 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-400',
                      )}>
                        {isDone ? <CheckCircle className="w-4 h-4" /> : isCurrent ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn('text-sm font-medium', isDone ? 'text-success-600 dark:text-success-400' : isCurrent ? 'text-primary-500' : 'text-surface-500')}>{step.name}</span>
                          {isCurrent && <Badge variant="primary">Running</Badge>}
                          {isDone && <Badge variant="success">Done</Badge>}
                        </div>
                        <p className="text-[11px] text-surface-400 mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Results */}
          {training.metrics && Object.keys(training.metrics).length > 0 && (
            <Card>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-1.5 rounded-lg bg-amber-500/10"><BarChart3 className="w-3.5 h-3.5 text-amber-500" /></div>
                <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 uppercase tracking-wider">Training Results</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(training.metrics).map(([key, value]) => (
                  <div key={key} className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-100 dark:border-white/[0.04]">
                    <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">{key.replace(/_/g, ' ')}</p>
                    <p className="text-lg font-bold text-surface-900 dark:text-surface-100">
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
