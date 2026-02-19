import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-white/[0.03] flex-shrink-0">
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
        <button className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-label hover:text-white hover:bg-white/[0.08] transition-all duration-300" title="Filters">
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
