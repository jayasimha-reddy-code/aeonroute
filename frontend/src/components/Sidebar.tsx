import { useActiveTab, useSetActiveTab, AppTab } from '../store/store';
import { LayoutDashboard, Map, BarChart3, Zap, Settings, Brain, Target, Activity, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

const navItems: Array<{ id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'routing', label: 'Map', icon: Map },
  { id: 'analytics', label: 'Overview', icon: BarChart3 },
  { id: 'stations', label: 'Stations', icon: Zap },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const secondaryNav = [
  { icon: Brain, label: 'AI Models' },
  { icon: Target, label: 'Routing' },
  { icon: Activity, label: 'Monitoring' },
];

export default function Sidebar() {
  const activeTab = useActiveTab();
  const setActiveTab = useSetActiveTab();

  return (
    <aside className="w-56 h-screen flex flex-col bg-white/[0.02] backdrop-blur-2xl border-r border-white/[0.05] flex-shrink-0">

      {/* ── Brand ── */}
      <div className="p-5 pb-3">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-dim flex items-center justify-center">
            <Zap className="w-4.5 h-4.5 text-emerald" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">EV Routing System</span>
        </div>

        {/* User status dropdown */}
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all duration-300">
          <span className="w-2 h-2 rounded-full bg-emerald animate-pulse-glow" />
          <div className="flex-1 text-left">
            <p className="text-xs text-label">User</p>
            <p className="text-xs font-medium text-white">Status</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-label" />
        </button>
      </div>

      {/* ── Primary nav ── */}
      <nav className="flex-1 px-3 py-2 space-y-1" role="navigation" aria-label="Main">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
                isActive
                  ? 'bg-emerald-dim text-emerald shadow-glow-emerald/20'
                  : 'text-label hover:text-white hover:bg-white/[0.04]'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              <span>{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald" />
              )}
            </button>
          );
        })}

        {/* Separator */}
        <div className="!my-4 h-px bg-white/[0.05]" />

        {/* Secondary nav icons */}
        {secondaryNav.map(item => (
          <button
            key={item.label}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-label hover:text-white hover:bg-white/[0.04] transition-all duration-300"
          >
            <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Bottom bar ── */}
      <div className="p-3 border-t border-white/[0.05]">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-emerald" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">User status</p>
            <p className="text-[10px] text-label truncate">Online</p>
          </div>
          <Settings className="w-4 h-4 text-label hover:text-white cursor-pointer transition-colors" />
        </div>
      </div>
    </aside>
  );
}
