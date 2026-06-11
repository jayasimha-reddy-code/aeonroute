import { Zap, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '../../ui';
import { useSimulationScale, useSettings, useEVState } from '../../../store/store';
import { useSimulationStore } from '../../../store/simulationStore';
import { Route } from '../../../services/api';
import { cn } from '../../../lib/utils';

interface SimulationControllerProps {
  selectedRoute: Route;
  onStartSim: () => void;
  speedMultiplier: 1 | 2 | 4;
  setSpeedMultiplier: (s: 1 | 2 | 4) => void;
}

export function SimulationController({ selectedRoute, onStartSim, speedMultiplier, setSpeedMultiplier }: SimulationControllerProps) {
  const simState = useSimulationStore();
  const { currentEVState } = useEVState();
  const simulationScale = useSimulationScale();
  const settings = useSettings();
  
  const KM_TO_MI = 0.621371;
  const toDistDisplay = (km: number) =>
    settings.units === 'imperial' ? `${(km * KM_TO_MI).toFixed(1)} mi` : `${km.toFixed(1)} km`;

  const resetSim = () => simState.resetSimulation();
  const pauseSim = () => simState.pauseSimulation();
  const resumeSim = () => simState.resumeSimulation();

  return (
    <div className="glass px-5 py-4">
      {simState.isBatteryDepleted ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-sm font-semibold text-rose-400">Battery Depleted</span>
            <span className="text-xs text-muted ml-2">0% SOC reached</span>
          </div>
          <Button variant="ghost" icon={RotateCcw} onClick={resetSim}>Reset</Button>
        </div>
      ) : !simState.isSimulating && simState.progress >= 1 ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald" />
            <span className="text-sm font-semibold text-emerald-400">Route Complete</span>
            {selectedRoute?.energy_kwh && (
              <span className="text-xs text-muted ml-2">
                {selectedRoute.energy_kwh.toFixed(1)} kWh used
              </span>
            )}
          </div>
          <Button variant="ghost" icon={RotateCcw} onClick={resetSim}>Restart</Button>
        </div>
      ) : (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            {!simState.isSimulating ? (
              <Button variant="primary" icon={Play} onClick={onStartSim}>Simulate</Button>
            ) : simState.isPaused ? (
              <Button variant="primary" icon={Play} onClick={resumeSim}>Resume</Button>
            ) : (
              <Button variant="secondary" icon={Pause} onClick={pauseSim}>Pause</Button>
            )}
            {(simState.isSimulating || simState.progress > 0) && (
              <Button variant="ghost" icon={RotateCcw} onClick={resetSim} />
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted mr-0.5">Speed</span>
            {([1, 2, 4] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSpeedMultiplier(s)}
                className={cn(
                  'text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors',
                  speedMultiplier === s
                    ? 'bg-emerald/20 border-emerald text-emerald'
                    : 'bg-white/[0.04] border-white/10 text-muted hover:text-white hover:border-white/20',
                )}
              >
                {s}×
              </button>
            ))}
          </div>

          {simulationScale !== 'light' && (
            <div className="flex items-center gap-2 flex-1 min-w-[120px]">
              <Zap className={cn('w-3.5 h-3.5 flex-shrink-0', simState.isBatteryLow ? 'text-amber-400 animate-pulse' : 'text-muted')} />
              <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    simState.isBatteryLow ? 'bg-amber-400' : 'bg-emerald',
                    simulationScale === 'full' ? 'shadow-[0_0_8px_rgba(16,185,129,0.7)]' : '',
                  )}
                  style={{ width: `${Math.max(0, simState.currentSOC)}%` }}
                />
              </div>
              <span className={cn('text-xs font-mono w-9 text-right', simState.isBatteryLow ? 'text-amber-400' : 'text-white')}>
                {simState.currentSOC.toFixed(0)}%
              </span>
              {simulationScale === 'full' && (
                <span className="text-[10px] text-slate-500 font-mono">
                  {(simState.currentSOC / 100 * currentEVState.battery_capacity_kwh).toFixed(1)} kWh
                </span>
              )}
              {simState.isBatteryLow && (
                <span className="text-xs text-amber-400 animate-pulse">Low</span>
              )}
            </div>
          )}

          {simState.isSimulating && selectedRoute?.distance_km && (
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <span className="text-white font-mono">
                {toDistDisplay(simState.progress * selectedRoute.distance_km)}
              </span>
              <span>/</span>
              <span>{toDistDisplay(selectedRoute.distance_km)}</span>
            </div>
          )}

          {simulationScale === 'full' && simState.isSimulating && !simState.isPaused && (
            <div className="flex items-center gap-1 text-[10px] text-emerald/60">
              <span className="animate-ping inline-block w-1 h-1 rounded-full bg-emerald/40" />
              <span className="animate-ping inline-block w-1 h-1 rounded-full bg-emerald/30 delay-75" />
              <span className="animate-ping inline-block w-1 h-1 rounded-full bg-emerald/20 delay-150" />
            </div>
          )}

          {simState.isSimulating && selectedRoute?.time_minutes && !simState.isCharging && (
            <div className="text-xs text-muted">
              ~{Math.max(0, Math.round(selectedRoute.time_minutes * (1 - simState.progress)))} min remaining
            </div>
          )}

          {simState.isCharging && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              Charging…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
