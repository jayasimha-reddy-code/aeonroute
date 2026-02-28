import { useCallback, useMemo } from 'react';
import { useSSE } from './useSSE';
import {
  useUpdateTrainingFromSSE,
  useSetSSEConnected,
  useAddToast,
  useAddActivity,
} from '../store/store';
import type { SSETrainingEvent } from '../services/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Bridge hook — connects SSE events to Zustand training slice.
 *
 * When `enabled` is true an EventSource is opened to the backend
 * `/api/training/stream` endpoint.  Every named event is parsed and
 * dispatched to the Zustand `updateTrainingFromSSE` action.
 *
 * Supports multiplexed events (Override #3):
 *  - "typed" events contain { type: "metric"|"log"|"status", ... }
 *  - Legacy "progress"/"complete"/"stopped"/"idle" events still handled.
 */
export function useTrainingStream(enabled: boolean) {
  const updateTraining = useUpdateTrainingFromSSE();
  const setSSEConnected = useSetSSEConnected();
  const addToast = useAddToast();
  const addActivity = useAddActivity();

  const handleEvent = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        updateTraining(data);
      } catch {
        // malformed JSON — ignore
      }
    },
    [updateTraining],
  );

  /**
   * Handle multiplexed "typed" events — routes by type discriminator.
   */
  const handleTypedEvent = useCallback(
    (event: MessageEvent) => {
      try {
        const data: SSETrainingEvent = JSON.parse(event.data);
        switch (data.type) {
          case 'metric':
            // Route metric → training chart (add to reward/loss history)
            updateTraining({
              new_reward_points: [{ episode: data.episode, reward: data.reward }],
              new_loss_points: [{ episode: data.episode, td_error: data.loss }],
              rl_episode: data.episode + 1,
            });
            break;
          case 'log':
            // Route log → training log buffer (stored in training store)
            updateTraining({
              _log_event: { timestamp: data.timestamp, message: data.message },
            });
            break;
          case 'status':
            // Route status → progress bar
            updateTraining({
              progress: Math.round(data.progress * 100),
              current_step: data.phase,
            });
            break;
        }
      } catch {
        // malformed JSON — ignore
      }
    },
    [updateTraining],
  );

  const onEvent = useMemo<Record<string, (e: MessageEvent) => void>>(
    () => ({
      progress: handleEvent,
      typed: handleTypedEvent,
      complete: (event) => {
        handleEvent(event);
        addToast({ type: 'success', title: 'Training Complete', message: 'All models trained successfully.' });
        addActivity('training', 'Q-Learning training complete');
      },
      stopped: (event) => {
        handleEvent(event);
        addToast({ type: 'warning', title: 'Training Stopped' });
      },
      idle: handleEvent,
    }),
    [handleEvent, handleTypedEvent, addToast, addActivity],
  );

  const onOpen = useCallback(() => setSSEConnected(true), [setSSEConnected]);
  const onError = useCallback(() => setSSEConnected(false), [setSSEConnected]);
  const onMaxRetriesReached = useCallback(() => {
    setSSEConnected(false);
  }, [setSSEConnected]);

  return useSSE({
    url: `${API_URL}/api/training/stream`,
    onEvent,
    onOpen,
    onError,
    onMaxRetriesReached,
    enabled,
  });
}

export default useTrainingStream;
