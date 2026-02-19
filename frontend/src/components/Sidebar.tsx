import { NavLink } from 'react-router-dom';
import { useSidebarCollapsed, useToggleSidebar, type AppTab } from '../store/store';
import { LayoutDashboard, Map, BarChart3, Zap, Settings, Brain, Target, Activity, ChevronDown, PanelLeftClose, PanelLeft } from 'lucide-react';
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
  const collapsed = useSidebarCollapsed();
  const toggleSidebar = useToggleSidebar();

  return (
    <aside className={cn(
      'h-screen flex flex-col bg-white/[0.02] backdrop-blur-3xl border-r border-white/10 flex-shrink-0 relative z-10 transition-all duration-300',
      collapsed ? 'w-16' : 'w-56'
    )}>

      {/* ── Brand ── */}
      <div className={cn('p-5 pb-3', collapsed && 'px-3')}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-dim flex items-center justify-center flex-shrink-0">
            <Zap className="w-4.5 h-4.5 text-emerald" />
          </div>
          {!collapsed && (
            <span className="text-sm font-bold text-white tracking-tight">EV Routing System</span>
          )}
          <button
            onClick={toggleSidebar}
            className={cn(
              'w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-label hover:text-white hover:bg-white/[0.08] transition-all duration-300',
              collapsed ? 'mx-auto mt-2' : 'ml-auto'
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* User status dropdown */}
        {!collapsed && (
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all duration-300">
            <span className="w-2 h-2 rounded-full bg-emerald animate-pulse-glow" />
            <div className="flex-1 text-left">
              <p className="text-xs text-label">User</p>
              <p className="text-xs font-medium text-white">Status</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-label" />
          </button>
        )}
      </div>

      {/* ── Primary nav ── */}
      <nav className={cn('flex-1 py-2 space-y-1', collapsed ? 'px-2' : 'px-3')} role="navigation" aria-label="Main">
        {navItems.map(item => (
          <NavLink
            key={item.id}
            to={`/${item.id}`}
            className={({ isActive }) => cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
              collapsed && 'justify-center px-0',
              isActive
                ? 'text-emerald-400 bg-white/[0.05] shadow-[inset_2px_0_0_#10b981]'
                : 'text-label hover:text-white hover:bg-white/[0.04]'
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
                {isActive && !collapsed && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald" />
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Separator */}
        <div className="!my-4 h-px bg-white/[0.05]" />

        {/* Secondary nav icons */}
        {secondaryNav.map(item => (
          <button
            key={item.label}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-label hover:text-white hover:bg-white/[0.04] transition-all duration-300',
              collapsed && 'justify-center px-0'
            )}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* ── Bottom bar ── */}
      <div className="p-3 border-t border-white/[0.05]">
        <div className={cn('flex items-center gap-2.5 px-3 py-2', collapsed && 'justify-center px-0')}>
          <span className="w-2 h-2 rounded-full bg-emerald flex-shrink-0" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">User status</p>
              <p className="text-[10px] text-label truncate">Online</p>
            </div>
          )}
          {!collapsed && (
            <Settings className="w-4 h-4 text-label hover:text-white cursor-pointer transition-colors" />
          )}
        </div>
      </div>
    </aside>
  );
}
