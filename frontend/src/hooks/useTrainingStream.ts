import { useCallback, useMemo } from 'react';
import { useSSE } from './useSSE';
import {
  useUpdateTrainingFromSSE,
  useSetSSEConnected,
  useAddToast,
} from '../store/store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Bridge hook — connects SSE events to Zustand training slice.
 *
 * When `enabled` is true an EventSource is opened to the backend
 * `/api/training/stream` endpoint.  Every named event is parsed and
 * dispatched to the Zustand `updateTrainingFromSSE` action.
 */
export function useTrainingStream(enabled: boolean) {
  const updateTraining = useUpdateTrainingFromSSE();
  const setSSEConnected = useSetSSEConnected();
  const addToast = useAddToast();

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

  const onEvent = useMemo<Record<string, (e: MessageEvent) => void>>(
    () => ({
      progress: handleEvent,
      complete: (event) => {
        handleEvent(event);
        addToast({ type: 'success', title: 'Training Complete', message: 'All models trained successfully.' });
      },
      stopped: (event) => {
        handleEvent(event);
        addToast({ type: 'warning', title: 'Training Stopped' });
      },
      idle: handleEvent,
    }),
    [handleEvent, addToast],
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
