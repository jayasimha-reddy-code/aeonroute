import { useState, useEffect, useCallback, useRef } from 'react';
import api, { SystemHealth } from '../services/api';

interface UseSystemHealthReturn {
  health: SystemHealth | null;
  loading: boolean;
  error: Error | null;
  loadData: () => Promise<void>;
}

export function useSystemHealth(autoRefreshIntervalMs = 0): UseSystemHealthReturn {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const data = await api.getSystemHealth();
      setHealth(data);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (autoRefreshIntervalMs <= 0) return;

    const startPolling = () => {
      intervalRef.current = setInterval(() => {
        if (!document.hidden) loadData();
      }, autoRefreshIntervalMs);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      } else {
        loadData();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadData, autoRefreshIntervalMs]);

  return { health, loading, error, loadData };
}
