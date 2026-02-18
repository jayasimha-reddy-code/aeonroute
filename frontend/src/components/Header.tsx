import { useActiveTab } from '../store/store';
import { LayoutGrid, List, SlidersHorizontal } from 'lucide-react';

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  routing: 'Route Planner',
  training: 'Training',
  analytics: 'Analytics',
  stations: 'Stations',
  settings: 'Settings',
};

export default function Header() {
  const activeTab = useActiveTab();
  const title = pageTitles[activeTab] || 'Dashboard';

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-white/[0.03] flex-shrink-0">
      {/* Page title */}
      <h1 className="text-lg font-semibold text-white tracking-tight">{title}</h1>

      {/* Action icons */}
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-label hover:text-white hover:bg-white/[0.08] transition-all duration-300" title="Grid view">
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-label hover:text-white hover:bg-white/[0.08] transition-all duration-300" title="List view">
          <List className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-label hover:text-white hover:bg-white/[0.08] transition-all duration-300" title="Filters">
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
