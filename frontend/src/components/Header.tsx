import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutGrid, List, SlidersHorizontal, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { useViewMode, useSetViewMode } from '../store/store';

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  routing: 'Route Planner',
  training: 'Training',
  analytics: 'Analytics',
  stations: 'Stations',
  settings: 'Settings',
  'ai-models': 'AI Models',
  'routing-config': 'Routing',
  monitoring: 'Monitoring',
};

export default function Header() {
  const location = useLocation();
  const segment = location.pathname.split('/')[1] || 'dashboard';
  const title = pageTitles[segment] || 'Dashboard';
  const viewMode = useViewMode();
  const setViewMode = useSetViewMode();
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ showActive: true, showCompleted: true, showPending: true });
  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on outside click
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

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-white/[0.04] flex-shrink-0">
      {/* Page title */}
      <h1 className="text-lg font-semibold text-white tracking-tight">{title}</h1>

      {/* Action icons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode('grid')}
          className={cn(
            'w-8 h-8 rounded-lg border flex items-center justify-center transition-all duration-300',
            viewMode === 'grid'
              ? 'bg-emerald/20 border-emerald/30 text-emerald'
              : 'bg-white/[0.04] border-white/[0.06] text-label hover:text-white hover:bg-white/[0.08]'
          )}
          title="Grid view"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={cn(
            'w-8 h-8 rounded-lg border flex items-center justify-center transition-all duration-300',
            viewMode === 'list'
              ? 'bg-emerald/20 border-emerald/30 text-emerald'
              : 'bg-white/[0.04] border-white/[0.06] text-label hover:text-white hover:bg-white/[0.08]'
          )}
          title="List view"
        >
          <List className="w-4 h-4" />
        </button>
        <div ref={filterRef} className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={cn(
              'w-8 h-8 rounded-lg border flex items-center justify-center transition-all duration-300',
              filterOpen
                ? 'bg-emerald/20 border-emerald/30 text-emerald'
                : 'bg-white/[0.04] border-white/[0.06] text-label hover:text-white hover:bg-white/[0.08]'
            )}
            title="Filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount < 3 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald text-[9px] font-bold text-white flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          {filterOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#0f141c] border border-white/10 backdrop-blur-[40px] shadow-2xl z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Show items</p>
              {[
                { key: 'showActive' as const, label: 'Active' },
                { key: 'showCompleted' as const, label: 'Completed' },
                { key: 'showPending' as const, label: 'Pending' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setFilters(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.04] hover:text-white transition-colors duration-150"
                >
                  <span className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center transition-all',
                    filters[opt.key]
                      ? 'bg-emerald border-emerald text-white'
                      : 'border-white/20 bg-transparent'
                  )}>
                    {filters[opt.key] && <Check className="w-3 h-3" />}
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
