import { create } from 'zustand';

export interface LossPoint {
  epoch: number;
  g_loss: number;
  d_loss_real: number;
  d_loss_fake: number;
}

export interface RewardPoint {
  episode: number;
  reward: number;
  length: number;
}

export interface TrainingProgress {
  is_training: boolean;
  progress: number;
  current_step: string;
  metrics: Record<string, any>;
  gan_epoch: number;
  gan_total_epochs: number;
  rl_episode: number;
  rl_total_episodes: number;
}

interface TrainingState {
  sseConnected: boolean;
  setSSEConnected: (connected: boolean) => void;
  trainingProgress: TrainingProgress;
  lossHistory: LossPoint[];
  rewardHistory: RewardPoint[];
  trainingLogs: Array<{ timestamp: string; message: string }>;
  updateTrainingFromSSE: (data: any) => void;
  resetTrainingData: () => void;
}

export const useTrainingStore = create<TrainingState>((set) => ({
  sseConnected: false,
  setSSEConnected: (connected) => set({ sseConnected: connected }),

  trainingProgress: {
    is_training: false,
    progress: 0,
    current_step: '',
    metrics: {},
    gan_epoch: 0,
    gan_total_epochs: 0,
    rl_episode: 0,
    rl_total_episodes: 0,
  },

  lossHistory: [],
  rewardHistory: [],
  trainingLogs: [],

  updateTrainingFromSSE: (data: any) =>
    set((s) => {
      const newProgress: TrainingProgress = {
        ...s.trainingProgress,
        is_training: data.is_training ?? s.trainingProgress.is_training,
        progress: data.progress ?? s.trainingProgress.progress,
        current_step: data.current_step ?? s.trainingProgress.current_step,
        metrics: data.metrics ?? s.trainingProgress.metrics,
        gan_epoch: data.gan_epoch ?? s.trainingProgress.gan_epoch,
        gan_total_epochs: data.gan_total_epochs ?? s.trainingProgress.gan_total_epochs,
        rl_episode: data.rl_episode ?? s.trainingProgress.rl_episode,
        rl_total_episodes: data.rl_total_episodes ?? s.trainingProgress.rl_total_episodes,
      };

      let newLoss = s.lossHistory;
      if (Array.isArray(data.new_loss_points) && data.new_loss_points.length > 0) {
        newLoss = [...s.lossHistory, ...data.new_loss_points];
        if (newLoss.length > 1000) newLoss = newLoss.slice(newLoss.length - 1000);
      }

      let newReward = s.rewardHistory;
      if (Array.isArray(data.new_reward_points) && data.new_reward_points.length > 0) {
        newReward = [...s.rewardHistory, ...data.new_reward_points];
        if (newReward.length > 2000) newReward = newReward.slice(newReward.length - 2000);
      }

      let newLogs = s.trainingLogs;
      if (data._log_event) {
        newLogs = [...s.trainingLogs, data._log_event];
        if (newLogs.length > 500) newLogs = newLogs.slice(newLogs.length - 500);
      }

      return {
        trainingProgress: newProgress,
        lossHistory: newLoss,
        rewardHistory: newReward,
        trainingLogs: newLogs,
      };
    }),

  resetTrainingData: () =>
    set({
      lossHistory: [],
      rewardHistory: [],
      trainingLogs: [],
      trainingProgress: {
        is_training: false,
        progress: 0,
        current_step: '',
        metrics: {},
        gan_epoch: 0,
        gan_total_epochs: 0,
        rl_episode: 0,
        rl_total_episodes: 0,
      },
    }),
}));
