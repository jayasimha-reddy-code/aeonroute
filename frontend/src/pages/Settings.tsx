import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Car, Gauge, Palette, Globe, Save, MapPin, Cpu } from 'lucide-react';
import { Card, ToggleSwitch } from '../components/ui';
import { hyperStaggerContainer, hyperStaggerItem } from '../lib/motion';
import { useSettings, useSetUnits, useSetAvoidTolls, useSetOptimizeBattery, useSetNotifications, useAddToast } from '../store/store';
import api, { SystemConfig } from '../services/api';

export default function Settings() {
  const [vehicleProfile, setVehicleProfile] = useState('tesla_model_3_lr');
  const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
  const settings = useSettings();
  const setUnits = useSetUnits();
  const setAvoidTolls = useSetAvoidTolls();
  const setOptimizeBattery = useSetOptimizeBattery();
  const setNotifications = useSetNotifications();
  const addToast = useAddToast();

  // Fetch system config on mount
  useEffect(() => {
    api.getSystemConfig().then(setSysConfig).catch(() => {});
  }, []);

  return (
    <motion.div
      className="grid grid-cols-12 gap-4 lg:gap-6"
      variants={hyperStaggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* ── Vehicle Profile ── */}
      <motion.div className="col-span-12 lg:col-span-6" variants={hyperStaggerItem}>
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald/10 flex items-center justify-center">
              <Car className="w-5 h-5 text-emerald" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Vehicle Profile</h3>
              <p className="text-xs text-muted">Configure your EV specifications</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-label mb-1.5 block">Vehicle Model</label>
              <select
                value={vehicleProfile}
                onChange={(e) => setVehicleProfile(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white appearance-none cursor-pointer hover:bg-white/[0.06] transition-colors"
              >
                <option value="tesla_model_3_lr">Tesla Model 3 LR</option>
                <option value="tesla_model_y">Tesla Model Y</option>
                <option value="rivian_r1t">Rivian R1T</option>
                <option value="ford_mach_e">Ford Mustang Mach-E</option>
                <option value="bmw_ix">BMW iX xDrive50</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/[0.03]">
                <p className="text-[10px] text-muted uppercase tracking-wider">Battery Capacity</p>
                <p className="text-lg font-bold text-white mt-0.5">82 kWh</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03]">
                <p className="text-[10px] text-muted uppercase tracking-wider">Range (EPA)</p>
                <p className="text-lg font-bold text-white mt-0.5">358 mi</p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── Route Preferences ── */}
      <motion.div className="col-span-12 lg:col-span-6" variants={hyperStaggerItem}>
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-cyan/10 flex items-center justify-center">
              <Gauge className="w-5 h-5 text-cyan" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Route Preferences</h3>
              <p className="text-xs text-muted">Customize routing behavior</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
              <div>
                <p className="text-sm text-white">Avoid Tolls</p>
                <p className="text-xs text-muted">Route around toll roads when possible</p>
              </div>
              <ToggleSwitch checked={settings.avoidTolls} onChange={setAvoidTolls} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
              <div>
                <p className="text-sm text-white">Optimize for Battery</p>
                <p className="text-xs text-muted">Prefer energy-efficient routes</p>
              </div>
              <ToggleSwitch checked={settings.optimizeBattery} onChange={setOptimizeBattery} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
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
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-amber" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Display</h3>
              <p className="text-xs text-muted">Interface preferences</p>
            </div>
          </div>
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
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-rose/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-rose" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">API & System</h3>
              <p className="text-xs text-muted">Backend connection settings</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-white/[0.02]">
              <p className="text-[10px] text-muted uppercase tracking-wider">API Endpoint</p>
              <p className="text-sm text-white font-mono mt-1">http://localhost:8000</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02]">
              <p className="text-[10px] text-muted uppercase tracking-wider">Status</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
                <p className="text-sm text-emerald font-medium">Connected</p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── Simulation Scale & Resources ── */}
      <motion.div className="col-span-12 lg:col-span-6" variants={hyperStaggerItem}>
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-cyan/10 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyan" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Simulation Scale & Resources</h3>
              <p className="text-xs text-muted">Active hardware constraints from <code className="text-emerald">.env</code></p>
            </div>
          </div>
          {sysConfig ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.03]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3 h-3 text-emerald" />
                    <p className="text-[10px] text-muted uppercase tracking-wider">Map Radius</p>
                  </div>
                  <p className="text-lg font-bold text-white">{sysConfig.osmnx_radius_km} km</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Cpu className="w-3 h-3 text-amber" />
                    <p className="text-[10px] text-muted uppercase tracking-wider">Max Episodes</p>
                  </div>
                  <p className="text-lg font-bold text-white">{sysConfig.max_training_episodes}</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03]">
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
          ) : (
            <div className="h-24 flex items-center justify-center">
              <p className="text-xs text-muted">Loading config…</p>
            </div>
          )}
        </Card>
      </motion.div>

      {/* ── Save Button ── */}
      <motion.div className="col-span-12" variants={hyperStaggerItem}>
        <button
          onClick={() => addToast({ type: 'success', title: 'Settings Saved', message: 'Your preferences have been saved globally.' })}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald text-midnight font-semibold text-sm hover:bg-emerald/90 transition-all duration-300 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Preferences
        </button>
      </motion.div>
    </motion.div>
  );
}
