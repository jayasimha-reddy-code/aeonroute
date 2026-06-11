import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Car, Gauge, Palette, Globe, Save, MapPin, Cpu, Zap, Settings2 } from 'lucide-react';
import { Card, ToggleSwitch, CardHeader } from '../components/ui';
import PageHeader from '../components/layout/PageHeader';
import { hyperStaggerContainer, hyperStaggerItem } from '../lib/motion';
import {
  useSettings,
  useSetUnits, useSetAvoidTolls, useSetOptimizeBattery, useSetNotifications, useAddToast,
  useSetVehicleProfile, useSetBatteryCapacity, useSetSimulationScale, useSetEnergyWeight,
  useBatteryCapacity, useSimulationScale, useEnergyWeight,
  type SimulationScale,
} from '../store/store';
import { useSystemConfig } from '../hooks/useSystemConfig';
import { getHardwareProfile } from '../lib/hardware';

const VEHICLE_PROFILES: Record<string, { label: string; capacity: number; range: string }> = {
  tesla_model_3_lr: { label: 'Tesla Model 3 LR', capacity: 82, range: '358 mi' },
  tesla_model_y:    { label: 'Tesla Model Y',    capacity: 75, range: '330 mi' },
  rivian_r1t:       { label: 'Rivian R1T',        capacity: 135, range: '314 mi' },
  ford_mach_e:      { label: 'Ford Mustang Mach-E', capacity: 91, range: '312 mi' },
  bmw_ix:           { label: 'BMW iX xDrive50',   capacity: 105, range: '324 mi' },
};

const SCALE_ORDER: Record<string, number> = { light: 0, standard: 1, full: 2 };
const TIER_MAX: Record<string, SimulationScale> = {
  'low-end': 'light',
  'mid-range': 'standard',
  'high-end': 'full',
};

const SIM_SCALE_INFO: Record<SimulationScale, { episodes: number; time: string; hw: string }> = {
  light:    { episodes: 50,   time: '~30s',    hw: 'Best for quick demos. CPU sufficient.' },
  standard: { episodes: 200,  time: '~2 min',  hw: 'Balanced quality. CPU OK, GPU faster.' },
  full:     { episodes: 1000, time: '~10 min', hw: 'Maximum quality. GPU strongly recommended. May take 10+ minutes on CPU.' },
};

export default function Settings() {
  const { config: sysConfig } = useSystemConfig();
  const settings = useSettings();
  const setUnits = useSetUnits();
  const setAvoidTolls = useSetAvoidTolls();
  const setOptimizeBattery = useSetOptimizeBattery();
  const setNotifications = useSetNotifications();
  const addToast = useAddToast();
  const setVehicleProfile = useSetVehicleProfile();
  const setBatteryCapacity = useSetBatteryCapacity();
  const setSimulationScale = useSetSimulationScale();
  const setEnergyWeight = useSetEnergyWeight();
  const batteryCapacity = useBatteryCapacity();
  const simulationScale = useSimulationScale();
  const energyWeight = useEnergyWeight();

  const handleVehicleChange = (profileKey: string) => {
    const profile = VEHICLE_PROFILES[profileKey];
    if (profile) {
      setVehicleProfile(profileKey);
      setBatteryCapacity(profile.capacity);
    }
  };

  const hwProfile = useMemo(() => getHardwareProfile(), []);
  const isAboveTier = SCALE_ORDER[simulationScale] > SCALE_ORDER[TIER_MAX[hwProfile.tier]];

  const currentVehicle = VEHICLE_PROFILES[settings.vehicleProfile] ?? VEHICLE_PROFILES['tesla_model_3_lr'];
  const simInfo = SIM_SCALE_INFO[simulationScale];

  return (
    <motion.div
      className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto"
      variants={hyperStaggerContainer}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={hyperStaggerItem}>
        <PageHeader
          title="Settings"
          subtitle="Configure your EV, routing preferences, and simulation options"
          icon={Settings2}
        />
      </motion.div>

      <motion.div className="grid grid-cols-12 gap-4 lg:gap-6" variants={hyperStaggerItem}>
      {/* ── Vehicle Profile ── */}
      <motion.div className="col-span-12 lg:col-span-6" variants={hyperStaggerItem}>
        <Card>
          <CardHeader icon={Car} title="Vehicle Profile" subtitle="Configure your EV specifications" accent="emerald" />
          <div className="space-y-4">
            <div>
              <label className="text-xs text-label mb-1.5 block">Vehicle Model</label>
              <select
                value={settings.vehicleProfile}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white appearance-none cursor-pointer hover:bg-white/[0.06] transition-colors"
              >
                {Object.entries(VEHICLE_PROFILES).map(([key, v]) => (
                  <option key={key} value={key}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#0a0f16]/30">
                <p className="text-[10px] text-muted uppercase tracking-wider">Battery Capacity</p>
                <p className="text-lg font-bold text-white mt-0.5">{batteryCapacity} kWh</p>
              </div>
              <div className="p-3 rounded-xl bg-[#0a0f16]/30">
                <p className="text-[10px] text-muted uppercase tracking-wider">Range (EPA)</p>
                <p className="text-lg font-bold text-white mt-0.5">{currentVehicle.range}</p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── Energy Weight ── */}
      <motion.div className="col-span-12 lg:col-span-6" variants={hyperStaggerItem}>
        <Card>
          <CardHeader icon={Zap} title="Energy Consumption" subtitle="Affects route energy calculations" accent="amber" />
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-label">Energy Consumption (kWh/km)</label>
                <span className="text-sm font-bold text-amber">{(energyWeight ?? 0.18).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.30"
                step="0.01"
                value={energyWeight}
                onChange={(e) => setEnergyWeight(parseFloat(e.target.value))}
                className="w-full accent-amber"
              />
              <div className="flex justify-between text-[10px] text-muted mt-1">
                <span>0.10 (efficient)</span>
                <span>0.30 (aggressive)</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">Higher = more aggressive battery drain. Sent with every route request.</p>
          </div>
        </Card>
      </motion.div>

      {/* ── Simulation Scale ── */}
      <motion.div className="col-span-12 lg:col-span-6" variants={hyperStaggerItem}>
        <Card>
          <CardHeader icon={Cpu} title="Simulation Scale" subtitle="Training episode budget for the next run" accent="cyan" />
          <div className="space-y-4">
            {/* Recommended scale badge */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-label">Select Mode</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald/10 text-emerald border border-emerald/20">
                Recommended: {hwProfile.recommendations.simulationScale}
              </span>
            </div>
            <div className="flex gap-2">
              {(['light', 'standard', 'full'] as SimulationScale[]).map((scale) => (
                <button
                  key={scale}
                  onClick={() => setSimulationScale(scale)}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    simulationScale === scale
                      ? 'bg-cyan/20 text-cyan border border-cyan/30'
                      : 'bg-white/[0.04] text-label border border-white/[0.06] hover:bg-white/[0.06]'
                  }`}
                >
                  {scale.charAt(0).toUpperCase() + scale.slice(1)}
                </button>
              ))}
            </div>
            {/* Warning if scale is above hardware tier */}
            {isAboveTier && (
              <div className="p-2.5 rounded-xl bg-amber/5 border border-amber/20 text-xs text-amber flex items-start gap-2">
                <span>⚠</span>
                <span>
                  May cause lag on your hardware ({hwProfile.cpuCores} cores
                  {hwProfile.deviceMemoryGB ? `, ${hwProfile.deviceMemoryGB}GB RAM` : ''})
                </span>
              </div>
            )}
            {/* System Info */}
            <div className="flex items-center gap-2 text-[10px] text-muted">
              <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">
                {hwProfile.cpuCores} CPU cores
              </span>
              {hwProfile.deviceMemoryGB && (
                <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">
                  {hwProfile.deviceMemoryGB}GB RAM
                </span>
              )}
              <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] capitalize">
                {hwProfile.tier}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#0a0f16]/30">
                <p className="text-[10px] text-muted uppercase tracking-wider">Episodes</p>
                <p className="text-lg font-bold text-white mt-0.5">{simInfo.episodes}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#0a0f16]/30">
                <p className="text-[10px] text-muted uppercase tracking-wider">Est. Time</p>
                <p className="text-lg font-bold text-white mt-0.5">{simInfo.time}</p>
              </div>
            </div>
            <div className={`p-3 rounded-xl border text-xs ${
              simulationScale === 'full'
                ? 'bg-amber/5 border-amber/20 text-amber'
                : 'bg-white/[0.02] border-white/[0.06] text-slate-400'
            }`}>
              {simInfo.hw}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── Route Preferences ── */}
      <motion.div className="col-span-12 lg:col-span-6" variants={hyperStaggerItem}>
        <Card>
          <CardHeader icon={Gauge} title="Route Preferences" subtitle="Customize routing behavior" accent="cyan" />
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0a0f16]/30">
              <div>
                <p className="text-sm text-white">Avoid Tolls</p>
                <p className="text-xs text-muted">Route around toll roads when possible</p>
              </div>
              <ToggleSwitch checked={settings.avoidTolls} onChange={setAvoidTolls} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0a0f16]/30">
              <div>
                <p className="text-sm text-white">Optimize for Battery</p>
                <p className="text-xs text-muted">Prefer energy-efficient routes</p>
              </div>
              <ToggleSwitch checked={settings.optimizeBattery} onChange={setOptimizeBattery} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0a0f16]/30">
              <div>
                <p className="text-sm text-white">Notifications</p>
                <p className="text-xs text-muted">Charging and route alerts</p>
              </div>
              <ToggleSwitch checked={settings.notifications} onChange={setNotifications} />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── Display Settings ── */}
      <motion.div className="col-span-12 lg:col-span-6" variants={hyperStaggerItem}>
        <Card>
          <CardHeader icon={Palette} title="Display" subtitle="Interface preferences" accent="amber" />
          <div className="space-y-4">
            <div>
              <label className="text-xs text-label mb-1.5 block">Units</label>
              <div className="flex gap-2">
                {(['metric', 'imperial'] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnits(u)}
                    className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                      settings.units === u
                        ? 'bg-emerald/20 text-emerald border border-emerald/30'
                        : 'bg-white/[0.04] text-label border border-white/[0.06] hover:bg-white/[0.06]'
                    }`}
                  >
                    {u.charAt(0).toUpperCase() + u.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── API & System ── */}
      <motion.div className="col-span-12 lg:col-span-6" variants={hyperStaggerItem}>
        <Card>
          <CardHeader icon={Globe} title="API & System" subtitle="Backend connection settings" accent="rose" />
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-[#0a0f16]/30">
              <p className="text-[10px] text-muted uppercase tracking-wider">API Endpoint</p>
              <p className="text-sm text-white font-mono mt-1">http://localhost:8000</p>
            </div>
            <div className="p-3 rounded-xl bg-[#0a0f16]/30">
              <p className="text-[10px] text-muted uppercase tracking-wider">Status</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
                <p className="text-sm text-emerald font-medium">Connected</p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── Hardware Config (from backend .env) ── */}
      {sysConfig && (
        <motion.div className="col-span-12 lg:col-span-6" variants={hyperStaggerItem}>
          <Card>
            <CardHeader icon={Cpu} title="Active Hardware Config" subtitle="Loaded from .env" accent="cyan" />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#0a0f16]/30">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3 h-3 text-emerald" />
                    <p className="text-[10px] text-muted uppercase tracking-wider">Map Radius</p>
                  </div>
                  <p className="text-lg font-bold text-white">{sysConfig.osmnx_radius_km} km</p>
                </div>
                <div className="p-3 rounded-xl bg-[#0a0f16]/30">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Cpu className="w-3 h-3 text-amber" />
                    <p className="text-[10px] text-muted uppercase tracking-wider">Max Episodes</p>
                  </div>
                  <p className="text-lg font-bold text-white">{sysConfig.max_training_episodes}</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#0a0f16]/30">
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Map Center</p>
                <p className="text-sm text-white font-mono">
                  {sysConfig.osmnx_center_lat}, {sysConfig.osmnx_center_lon}
                  <span className="text-xs text-muted ml-2">— HITEC City</span>
                </p>
              </div>
              <p className="text-[11px] text-slate-500 italic mt-2">
                These limits are set in <code className="text-emerald/60">.env</code>. Increase for cloud deployment.
              </p>
            </div>
          </Card>
        </motion.div>
      )}

      {/* ── Save Button ── */}
      <motion.div className="col-span-12" variants={hyperStaggerItem}>
        <button
          onClick={() => addToast({ type: 'success', title: 'Settings Saved', message: 'Vehicle profile, energy weight, and simulation scale saved globally.' })}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald text-midnight font-semibold text-sm hover:bg-emerald/90 transition-all duration-300 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Preferences
        </button>
      </motion.div>
      </motion.div>
    </motion.div>
  );
}
