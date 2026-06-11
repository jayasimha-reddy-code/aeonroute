import { useState, useEffect, useCallback, useRef } from 'react';
import api, { SystemStats, RouteMetrics } from '../services/api';

interface UseSystemStatsReturn {
  stats: SystemStats | null;
  metrics: RouteMetrics | null;
  loading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  lastRefresh: Date | null;
  loadData: (isInitial?: boolean) => Promise<void>;
}

export function useSystemStats(autoRefreshIntervalMs = 0): UseSystemStatsReturn {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [metrics, setMetrics] = useState<RouteMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async (isInitial = false) => {
    if (!isInitial) setIsRefreshing(true);
    setError(null);
    try {
      const [systemStats, routeMetrics] = await Promise.all([
        api.getSystemStats(),
        api.getRouteMetrics(20),
      ]);
      setStats(systemStats);
      setMetrics(routeMetrics);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err);
    } finally {
      if (isInitial) setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
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

  return { stats, metrics, loading, isRefreshing, error, lastRefresh, loadData };
}
