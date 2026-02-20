import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, MapPin, Battery, Clock, Search, Filter, ChevronRight, Check } from 'lucide-react';
import { Card } from '../components/ui';
import { hyperStaggerContainer, hyperStaggerItem } from '../lib/motion';
import { cn } from '../lib/utils';

const MOCK_STATIONS = [
  { id: 1, name: 'Downtown Supercharger', status: 'available', power: 250, connectors: 8, available: 6, waitTime: '0 min' },
  { id: 2, name: 'Highway Rest Stop #12', status: 'busy', power: 150, connectors: 4, available: 1, waitTime: '15 min' },
  { id: 3, name: 'Mall Parking Level 3', status: 'available', power: 50, connectors: 12, available: 9, waitTime: '0 min' },
  { id: 4, name: 'Airport Terminal B', status: 'offline', power: 350, connectors: 6, available: 0, waitTime: 'N/A' },
  { id: 5, name: 'University Campus East', status: 'available', power: 22, connectors: 20, available: 14, waitTime: '0 min' },
  { id: 6, name: 'Central Park West', status: 'available', power: 150, connectors: 6, available: 4, waitTime: '0 min' },
  { id: 7, name: 'Industrial Zone Hub', status: 'busy', power: 350, connectors: 10, available: 2, waitTime: '8 min' },
  { id: 8, name: 'Waterfront Station', status: 'available', power: 250, connectors: 8, available: 7, waitTime: '0 min' },
];

const statusColor: Record<string, string> = {
  available: 'bg-emerald/20 text-emerald',
  busy: 'bg-amber/20 text-amber',
  offline: 'bg-rose/20 text-rose',
};

export default function Stations() {
  const [search, setSearch] = useState('');
  const [selectedStation, setSelectedStation] = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilters, setStatusFilters] = useState({ available: true, busy: true, offline: true });
  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter on outside click
  useEffect(() => {
    if (!filterOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [filterOpen]);

  // Close on Escape
  useEffect(() => {
    if (!filterOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFilterOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [filterOpen]);

  const filtered = MOCK_STATIONS.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) &&
    statusFilters[s.status as keyof typeof statusFilters]
  );

  const selected = MOCK_STATIONS.find((s) => s.id === selectedStation);

  return (
    <motion.div
      className="grid grid-cols-12 gap-4 lg:gap-6"
      variants={hyperStaggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* ── Search & Filter Bar ── */}
      <motion.div className="col-span-12" variants={hyperStaggerItem}>
        <Card className="flex items-center gap-3">
          <Search className="w-4 h-4 text-label flex-shrink-0" />
          <input
            type="text"
            placeholder="Search charging stations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-muted outline-none"
          />
          <div ref={filterRef} className="relative">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className={cn(
                'px-3 py-1.5 rounded-lg border text-xs transition-all duration-300 flex items-center gap-1.5',
                filterOpen
                  ? 'bg-emerald/20 border-emerald/30 text-emerald'
                  : 'bg-white/[0.04] border-white/[0.06] text-label hover:text-white hover:bg-white/[0.08]'
              )}
            >
              <Filter className="w-3 h-3" /> Filters
            </button>
            {filterOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl bg-[#0f141c] border border-white/10 backdrop-blur-[40px] shadow-2xl z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Status</p>
                {(['available', 'busy', 'offline'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilters(prev => ({ ...prev, [status]: !prev[status] }))}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.04] hover:text-white transition-colors duration-150"
                  >
                    <span className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center transition-all',
                      statusFilters[status]
                        ? 'bg-emerald border-emerald text-white'
                        : 'border-white/20 bg-transparent'
                    )}>
                      {statusFilters[status] && <Check className="w-3 h-3" />}
                    </span>
                    <span className="capitalize">{status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* ── Stat Summary Row ── */}
      <motion.div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4" variants={hyperStaggerItem}>
        {[
          { label: 'Total Stations', value: '127', icon: Zap, color: 'text-emerald' },
          { label: 'Available Now', value: '89', icon: MapPin, color: 'text-cyan' },
          { label: 'Avg Power', value: '164 kW', icon: Battery, color: 'text-amber' },
          { label: 'Avg Wait', value: '4 min', icon: Clock, color: 'text-rose' },
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

      {/* ── Station List ── */}
      <motion.div className="col-span-12 lg:col-span-7" variants={hyperStaggerItem}>
        <Card padding="none">
          <div className="px-5 pt-5 pb-3 border-b border-white/[0.05]">
            <h3 className="text-sm font-semibold text-white">Charging Stations</h3>
            <p className="text-xs text-muted mt-0.5">{filtered.length} stations found</p>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {filtered.map((station) => (
              <button
                key={station.id}
                onClick={() => setSelectedStation(station.id === selectedStation ? null : station.id)}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] cursor-pointer transition-colors duration-200 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#0a0f16]/30 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-emerald" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{station.name}</p>
                  <p className="text-xs text-muted">{station.power} kW · {station.connectors} connectors</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor[station.status]}`}>
                  {station.status}
                </span>
                <span className="text-xs text-muted">{station.available}/{station.connectors}</span>
                <ChevronRight className="w-4 h-4 text-label" />
              </button>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* ── Station Detail Panel ── */}
      <motion.div className="col-span-12 lg:col-span-5" variants={hyperStaggerItem}>
        <Card className="h-full min-h-[400px] flex items-center justify-center">
          {selected ? (
            <div className="text-center space-y-3 w-full px-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald/10 flex items-center justify-center mx-auto">
                <Zap className="w-8 h-8 text-emerald" />
              </div>
              <h3 className="text-lg font-semibold text-white">{selected.name}</h3>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColor[selected.status]}`}>
                {selected.status}
              </span>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-3 rounded-xl bg-[#0a0f16]/30">
                  <p className="text-xs text-muted">Power</p>
                  <p className="text-lg font-bold text-white">{selected.power} kW</p>
                </div>
                <div className="p-3 rounded-xl bg-[#0a0f16]/30">
                  <p className="text-xs text-muted">Wait Time</p>
                  <p className="text-lg font-bold text-white">{selected.waitTime}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#0a0f16]/30">
                  <p className="text-xs text-muted">Connectors</p>
                  <p className="text-lg font-bold text-white">{selected.connectors}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#0a0f16]/30">
                  <p className="text-xs text-muted">Available</p>
                  <p className="text-lg font-bold text-emerald">{selected.available}</p>
                </div>
              </div>
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
