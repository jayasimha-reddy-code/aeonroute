import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSidebarCollapsed, useToggleSidebar, type AppTab } from '../store/store';
import { LayoutDashboard, Map, BarChart3, Zap, Settings, ChevronDown, ChevronUp, PanelLeftClose, PanelLeft, Circle, Moon, Clock, MinusCircle, User, LogOut, GraduationCap } from 'lucide-react';
import { cn } from '../lib/utils';

const statusOptions = [
  { value: 'online', label: 'Online', icon: Circle, color: 'bg-emerald' },
  { value: 'away', label: 'Away', icon: Clock, color: 'bg-amber' },
  { value: 'dnd', label: 'Do Not Disturb', icon: MinusCircle, color: 'bg-rose' },
  { value: 'offline', label: 'Offline', icon: Moon, color: 'bg-slate-500' },
] as const;

const navItems: Array<{ id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'routing', label: 'Map', icon: Map },
  { id: 'training', label: 'Training', icon: GraduationCap },
  { id: 'analytics', label: 'Overview', icon: BarChart3 },
  { id: 'stations', label: 'Stations', icon: Zap },
  { id: 'settings', label: 'Settings', icon: Settings },
];



export default function Sidebar() {
  const collapsed = useSidebarCollapsed();
  const toggleSidebar = useToggleSidebar();
  const navigate = useNavigate();
  const [userStatus, setUserStatus] = useState<'online' | 'away' | 'dnd' | 'offline'>('online');
  const [statusOpen, setStatusOpen] = useState(false);
  const [gearOpen, setGearOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const gearRef = useRef<HTMLDivElement>(null);

  // Close status dropdown on outside click
  useEffect(() => {
    if (!statusOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [statusOpen]);

  // Close on Escape
  useEffect(() => {
    if (!statusOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStatusOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [statusOpen]);

  // Close gear dropdown on outside click
  useEffect(() => {
    if (!gearOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (gearRef.current && !gearRef.current.contains(e.target as Node)) {
        setGearOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [gearOpen]);

  // Close gear on Escape
  useEffect(() => {
    if (!gearOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGearOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [gearOpen]);

  const currentStatus = statusOptions.find(s => s.value === userStatus)!;

  return (
    <aside className={cn(
      'h-screen flex flex-col bg-[#0a0f16]/60 backdrop-blur-2xl border-r border-white/[0.08] flex-shrink-0 relative z-10 transition-all duration-300',
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
          <div ref={statusRef} className="relative">
            <button
              onClick={() => setStatusOpen(!statusOpen)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all duration-300"
            >
              <span className={cn('w-2 h-2 rounded-full', currentStatus.color, userStatus === 'online' && 'animate-pulse-glow')} />
              <div className="flex-1 text-left">
                <p className="text-xs text-label">User</p>
                <p className="text-xs font-medium text-white">{currentStatus.label}</p>
              </div>
              {statusOpen
                ? <ChevronUp className="w-3.5 h-3.5 text-label" />
                : <ChevronDown className="w-3.5 h-3.5 text-label" />
              }
            </button>
            {statusOpen && (
              <div className="absolute left-0 right-0 mt-1.5 rounded-xl bg-[#0a0f16]/80 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setUserStatus(opt.value); setStatusOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-150',
                      userStatus === opt.value
                        ? 'text-emerald bg-emerald/10'
                        : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full', opt.color)} />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
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


      </nav>

      {/* ── Bottom bar ── */}
      <div className="p-3 border-t border-white/[0.05]">
        <div className={cn('flex items-center gap-2.5 px-3 py-2', collapsed && 'justify-center px-0')}>
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', currentStatus.color)} />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">User status</p>
              <p className="text-[10px] text-label truncate">{currentStatus.label}</p>
            </div>
          )}
          {!collapsed && (
            <div ref={gearRef} className="relative">
              <button
                onClick={() => setGearOpen(!gearOpen)}
                className="p-1 rounded-lg hover:bg-white/[0.06] transition-all duration-300"
                title="User menu"
              >
                <Settings className="w-4 h-4 text-label hover:text-white cursor-pointer transition-colors" />
              </button>
              {gearOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-48 rounded-xl bg-[#0a0f16]/80 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 py-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <button
                    onClick={() => { navigate('/settings'); setGearOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.04] hover:text-white transition-colors duration-150"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <button
                    onClick={() => { navigate('/settings'); setGearOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.04] hover:text-white transition-colors duration-150"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                  <div className="h-px bg-white/[0.06] my-1" />
                  <button
                    onClick={() => setGearOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose hover:bg-rose/10 transition-colors duration-150"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
