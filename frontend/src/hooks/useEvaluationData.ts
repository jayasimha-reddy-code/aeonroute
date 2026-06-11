import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

interface EvaluationData {
  ganEval: Record<string, any> | null;
  agentPerf: Record<string, any> | null;
  routeEval: Record<string, any> | null;
  trainingHistory: {
    loss_history: { epoch: number; g_loss: number; d_loss_real: number }[];
    reward_history: { episode: number; reward: number }[];
    metrics: Record<string, any>;
  } | null;
}

interface UseEvaluationDataReturn extends EvaluationData {
  loading: boolean;
  error: Error | null;
  modelsReady: boolean;
  loadData: () => Promise<void>;
}

export function useEvaluationData(): UseEvaluationDataReturn {
  const [data, setData] = useState<EvaluationData>({
    ganEval: null,
    agentPerf: null,
    routeEval: null,
    trainingHistory: null,
  });
  const [loading, setLoading] = useState(true);
  const [modelsReady, setModelsReady] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.getGanEvaluation(),
        api.getAgentPerformance(),
        api.getRouteEvaluation(),
        api.getTrainingHistory(),
      ]);

      const [ganRes, agentRes, routeRes, historyRes] = results;

      // Check if models are "not_trained"
      const notTrained = [ganRes, agentRes, routeRes].every((r) => {
        if (r.status === 'rejected') return true;
        if (r.status === 'fulfilled' && r.value?.status === 'not_trained') return true;
        return false;
      });
      setModelsReady(!notTrained);

      setData({
        ganEval: ganRes.status === 'fulfilled' ? ganRes.value : null,
        agentPerf: agentRes.status === 'fulfilled' ? agentRes.value : null,
        routeEval: routeRes.status === 'fulfilled' ? routeRes.value : null,
        trainingHistory: historyRes.status === 'fulfilled' ? historyRes.value : null,
      });
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { ...data, loading, error, modelsReady, loadData };
}
