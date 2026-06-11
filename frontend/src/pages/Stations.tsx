import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, MapPin, Battery, Search, ChevronRight, ArrowRight } from 'lucide-react';
import { Card } from '../components/ui';
import { hyperStaggerContainer, hyperStaggerItem } from '../lib/motion';
import { useStations, useSystemStore } from '../store/store';
import api, { StationData } from '../services/api';

export default function Stations() {
  const navigate = useNavigate();
  const stations = useStations();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(stations.length === 0);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stations.length > 0) { setLoading(false); return; }
    api.getStations()
      .then(({ stations: data }) => useSystemStore.getState().setStations(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!filterOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [filterOpen]);

  const filtered = stations.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.operator.toLowerCase().includes(search.toLowerCase())
  );

  const selected = stations.find((s) => s.id === selectedId) ?? null;
  const avgPower = stations.length > 0
    ? Math.round(stations.reduce((sum, s) => sum + s.power_kw, 0) / stations.length)
    : 0;

  const handleRouteHere = (station: StationData) => {
    navigate(`/routing?destLat=${station.lat}&destLon=${station.lon}&destLabel=${encodeURIComponent(station.name)}`);
  };

  return (
    <motion.div
      className="grid grid-cols-12 gap-4 lg:gap-6"
      variants={hyperStaggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Search Bar */}
      <motion.div className="col-span-12" variants={hyperStaggerItem}>
        <Card className="flex items-center gap-3">
          <Search className="w-4 h-4 text-label flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by name or operator…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-muted outline-none"
          />
        </Card>
      </motion.div>

      {/* Stat Summary */}
      <motion.div className="col-span-12 grid grid-cols-2 md:grid-cols-3 gap-4" variants={hyperStaggerItem}>
        {[
          { label: 'Total Stations', value: loading ? '—' : String(stations.length), icon: Zap,     color: 'text-emerald' },
          { label: 'Avg Power',      value: loading ? '—' : `${avgPower} kW`,        icon: Battery, color: 'text-amber' },
          { label: 'Showing',        value: loading ? '—' : String(filtered.length), icon: MapPin,  color: 'text-cyan' },
        ].map((stat) => (
          <Card key={stat.label} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0a0f16]/30 flex items-center justify-center">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider">{stat.label}</p>
              <p className="text-lg font-bold text-white">{stat.value}</p>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Station List */}
      <motion.div className="col-span-12 lg:col-span-7" variants={hyperStaggerItem}>
        <Card padding="none">
          <div className="px-5 pt-5 pb-3 border-b border-white/[0.05]">
            <h3 className="text-sm font-semibold text-white">Charging Stations</h3>
            <p className="text-xs text-muted mt-0.5">
              {loading ? 'Loading stations…' : `${filtered.length} stations found`}
            </p>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-white/[0.06] rounded w-3/4" />
                      <div className="h-2 bg-white/[0.04] rounded w-1/2" />
                    </div>
                  </div>
                ))
              : filtered.map((station) => (
                  <button
                    key={station.id}
                    onClick={() => setSelectedId(station.id === selectedId ? null : station.id)}
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.04] cursor-pointer transition-colors duration-200 text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#0a0f16]/30 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-5 h-5 text-emerald" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{station.name}</p>
                      <p className="text-xs text-muted">{station.power_kw} kW · {station.num_ports} ports · {station.operator}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-label" />
                  </button>
                ))
            }
          </div>
        </Card>
      </motion.div>

      {/* Station Detail Panel */}
      <motion.div className="col-span-12 lg:col-span-5" variants={hyperStaggerItem}>
        <Card className="h-full min-h-[400px] flex items-center justify-center">
          {selected ? (
            <div className="text-center space-y-3 w-full px-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald/10 flex items-center justify-center mx-auto">
                <Zap className="w-8 h-8 text-emerald" />
              </div>
              <h3 className="text-lg font-semibold text-white">{selected.name}</h3>
              <p className="text-xs text-muted">{selected.operator}</p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-3 rounded-xl bg-[#0a0f16]/30">
                  <p className="text-xs text-muted">Power</p>
                  <p className="text-lg font-bold text-white">{selected.power_kw} kW</p>
                </div>
                <div className="p-3 rounded-xl bg-[#0a0f16]/30">
                  <p className="text-xs text-muted">Ports</p>
                  <p className="text-lg font-bold text-white">{selected.num_ports}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#0a0f16]/30 col-span-2">
                  <p className="text-xs text-muted">Coordinates</p>
                  <p className="text-sm font-mono text-white mt-0.5">{selected.lat.toFixed(4)}, {selected.lon.toFixed(4)}</p>
                </div>
              </div>
              <button
                onClick={() => handleRouteHere(selected)}
                className="mt-4 w-full px-4 py-3 rounded-xl bg-emerald text-midnight font-semibold text-sm flex items-center justify-center gap-2 hover:bg-emerald/90 transition-all duration-300"
              >
                <ArrowRight className="w-4 h-4" />
                Route Here
              </button>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <MapPin className="w-10 h-10 text-label mx-auto" />
              <p className="text-sm text-muted">Select a station to view details</p>
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
