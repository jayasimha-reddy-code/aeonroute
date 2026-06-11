import { useEffect, useRef, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────

export interface SSEOptions {
  /** Full URL for the EventSource connection */
  url: string;
  /** Callback for every SSE message (unnamed events) */
  onMessage?: (event: MessageEvent) => void;
  /** Named event handlers — keys match backend event names */
  onEvent?: Record<string, (event: MessageEvent) => void>;
  /** Called when connection opens */
  onOpen?: () => void;
  /** Called on connection error (before reconnect logic) */
  onError?: (event: Event) => void;
  /** Called when max retries exhausted */
  onMaxRetriesReached?: () => void;
  /** Enable / disable the connection */
  enabled?: boolean;
  /** Max reconnection attempts (default 10) */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default 1000) */
  baseDelay?: number;
  /** Max delay cap in ms (default 30000) */
  maxDelay?: number;
}

/**
 * Reusable SSE hook with exponential backoff reconnection.
 *
 * Uses useRef for the EventSource instance to avoid re-renders on reconnect.
 * Named SSE events ('progress', 'complete', 'stopped', 'idle') are wired via
 * addEventListener so they match the backend `event:` field.
 */
export function useSSE(options: SSEOptions): { close: () => void } {
  const {
    url,
    onMessage,
    onEvent,
    onOpen,
    onError,
    onMaxRetriesReached,
    enabled = true,
    maxRetries = 10,
    baseDelay = 1000,
    maxDelay = 30000,
  } = options;

  const esRef = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether the hook is still mounted
  const mountedRef = useRef(true);

  // Stable refs for callbacks so reconnect logic never goes stale
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onMaxRetriesRef = useRef(onMaxRetriesReached);
  onMaxRetriesRef.current = onMaxRetriesReached;

  const closeConnection = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    closeConnection();

    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      retriesRef.current = 0;
      onOpenRef.current?.();
    };

    // Default message handler (unnamed events)
    es.onmessage = (event) => {
      onMessageRef.current?.(event);
    };

    // Named event listeners matching backend event names
    // Include 'typed' for multiplexed SSE events (metric/log/status)
    const eventNames = ['progress', 'complete', 'stopped', 'idle', 'typed'];
    eventNames.forEach((name) => {
      es.addEventListener(name, ((event: MessageEvent) => {
        onEventRef.current?.[name]?.(event);
      }) as EventListener);
    });

    es.onerror = (event) => {
      onErrorRef.current?.(event);
      es.close();
      esRef.current = null;

      if (!mountedRef.current) return;

      if (retriesRef.current >= maxRetries) {
        onMaxRetriesRef.current?.();
        return;
      }

      const delay = Math.min(baseDelay * Math.pow(2, retriesRef.current), maxDelay);
      retriesRef.current += 1;

      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, maxRetries, baseDelay, maxDelay, closeConnection]);

  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      retriesRef.current = 0;
      connect();
    } else {
      closeConnection();
    }

    return () => {
      mountedRef.current = false;
      closeConnection();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, url]);

  return { close: closeConnection };
}

export default useSSE;
