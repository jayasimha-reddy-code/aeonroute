import { CheckCircle, Loader2 } from 'lucide-react';
import { Badge } from '../ui';
import { cn } from '../../lib/utils';

const PIPELINE_STEPS = [
  { name: 'Road Network',       desc: 'Building graph topology',      threshold: 10 },
  { name: 'Traffic Generation',  desc: 'Sampling synthetic patterns',  threshold: 25 },
  { name: 'GAN Training',        desc: 'Training SG-GAN generator',    threshold: 40 },
  { name: 'RL Environment',      desc: 'Initializing MDP',             threshold: 55 },
  { name: 'Agent Training',      desc: 'Q-learning episodes',          threshold: 75 },
  { name: 'Route Generator',     desc: 'GNN-GAN route generation',     threshold: 85 },
  { name: 'System Evaluation',   desc: 'Benchmark & metrics',          threshold: 95 },
];

interface PipelineStepperProps {
  progress: number;
  isTraining: boolean;
  currentStep: string;
  ganEpoch?: number;
  ganTotalEpochs?: number;
  rlEpisode?: number;
  rlTotalEpisodes?: number;
}

export function PipelineStepper({
  progress,
  isTraining,
  currentStep: _currentStep,
  ganEpoch,
  ganTotalEpochs,
  rlEpisode,
  rlTotalEpisodes,
}: PipelineStepperProps) {
  return (
    <div className="relative">
      {/* Vertical connector line in gutter */}
      <div className="absolute left-[17px] top-4 bottom-4 w-px bg-surface-200 dark:bg-surface-700/50" />

      <div className="space-y-0.5">
        {PIPELINE_STEPS.map((step, idx) => {
          const isDone = progress >= step.threshold;
          const isCurrent = isTraining && !isDone && (idx === 0 || progress >= PIPELINE_STEPS[idx - 1].threshold);

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
                {/* Sub-progress for GAN Training (index 2) */}
                {idx === 2 && isCurrent && ganEpoch != null && ganTotalEpochs != null && ganTotalEpochs > 0 && (
                  <p className="text-[10px] text-amber-500 mt-0.5">Epoch {ganEpoch}/{ganTotalEpochs}</p>
                )}
                {/* Sub-progress for Agent Training (index 4) */}
                {idx === 4 && isCurrent && rlEpisode != null && rlTotalEpisodes != null && rlTotalEpisodes > 0 && (
                  <p className="text-[10px] text-primary-400 mt-0.5">Episode {rlEpisode}/{rlTotalEpisodes}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PipelineStepper;
