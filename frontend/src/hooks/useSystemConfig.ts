import { useState, useEffect, useCallback } from 'react';
import api, { SystemConfig } from '../services/api';

interface UseSystemConfigReturn {
  config: SystemConfig | null;
  loading: boolean;
  error: Error | null;
  loadData: () => Promise<void>;
}

export function useSystemConfig(): UseSystemConfigReturn {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await api.getSystemConfig();
      setConfig(data);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { config, loading, error, loadData };
}
