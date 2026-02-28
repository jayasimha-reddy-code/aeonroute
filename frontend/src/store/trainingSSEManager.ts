/**
 * TrainingSSEManager — Vanilla TypeScript SSE Singleton
 * ======================================================
 * Owns the EventSource lifecycle independently of React.
 * Persists across page navigation — the SSE connection is NEVER
 * tied to a component's mount/unmount cycle.
 *
 * Usage:
 *   trainingSSE.connect()    — idempotent, opens if not already open
 *   trainingSSE.disconnect() — closes and clears EventSource
 *   trainingSSE.isConnected() — true when EventSource.OPEN
 */

// Import store via direct reference (works outside React components)
import { useSystemStore } from './store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const SSE_URL = `${API_URL}/api/training/stream`;

const MAX_RETRIES = 10;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

class TrainingSSEManager {
  private es: EventSource | null = null;
  private retries = 0;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private _enabled = false;

  // ── Public API ────────────────────────────────────────

  connect(): void {
    this._enabled = true;
    if (this.es && this.es.readyState !== EventSource.CLOSED) return; // already open
    this._openConnection();
  }

  disconnect(): void {
    this._enabled = false;
    this._close();
    this._setConnected(false);
  }

  isConnected(): boolean {
    return !!this.es && this.es.readyState === EventSource.OPEN;
  }

  // ── Private helpers ───────────────────────────────────

  private _openConnection(): void {
    if (!this._enabled) return;
    this._close(); // clean up any stale connection

    const es = new EventSource(SSE_URL);
    this.es = es;

    es.onopen = () => {
      this.retries = 0;
      this._setConnected(true);
    };

    es.onmessage = (event) => {
      this._handleRawEvent(event);
    };

    // Named event listeners — must match backend event names
    const namedEvents = ['progress', 'complete', 'stopped', 'idle', 'typed'] as const;
    namedEvents.forEach((name) => {
      es.addEventListener(name, (event) => {
        if (name === 'typed') {
          this._handleTypedEvent(event as MessageEvent);
        } else {
          this._handleRawEvent(event as MessageEvent);
        }
        // Additional side-effects for specific event types
        if (name === 'complete') {
          useSystemStore.getState().addToast({
            type: 'success',
            title: 'Training Complete',
            message: 'All models trained successfully.',
          });
          useSystemStore.getState().addActivity('training', 'Q-Learning training complete');
        } else if (name === 'stopped') {
          useSystemStore.getState().addToast({ type: 'warning', title: 'Training Stopped' });
        }
      });
    });

    es.onerror = () => {
      this._setConnected(false);
      es.close();
      this.es = null;

      if (!this._enabled) return;
      if (this.retries >= MAX_RETRIES) return;

      const delay = Math.min(BASE_DELAY_MS * Math.pow(2, this.retries), MAX_DELAY_MS);
      this.retries += 1;
      this.retryTimeout = setTimeout(() => {
        if (this._enabled) this._openConnection();
      }, delay);
    };
  }

  private _close(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    if (this.es) {
      this.es.close();
      this.es = null;
    }
  }

  private _setConnected(connected: boolean): void {
    useSystemStore.getState().setSSEConnected(connected);
  }

  private _handleRawEvent(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      useSystemStore.getState().updateTrainingFromSSE(data);
    } catch {
      // malformed JSON — ignore
    }
  }

  private _handleTypedEvent(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'metric':
          useSystemStore.getState().updateTrainingFromSSE({
            new_reward_points: [{ episode: data.episode, reward: data.reward }],
            new_loss_points: [{ episode: data.episode, td_error: data.loss }],
            rl_episode: data.episode + 1,
          });
          break;
        case 'log':
          useSystemStore.getState().updateTrainingFromSSE({
            _log_event: { timestamp: data.timestamp, message: data.message },
          });
          break;
        case 'status':
          useSystemStore.getState().updateTrainingFromSSE({
            progress: Math.round(data.progress * 100),
            current_step: data.phase,
          });
          break;
      }
    } catch {
      // malformed JSON — ignore
    }
  }
}

// ── Singleton export ───────────────────────────────────
export const trainingSSE = new TrainingSSEManager();
export default trainingSSE;
