import React, { useRef, useEffect } from 'react';
import { BarChart3, Map, Zap, ChevronLeft, X, Cpu, Activity, Brain } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSystemStore, AppTab } from '../store/store';

const menuItems: Array<{ id: AppTab; label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, description: 'System overview' },
  { id: 'route-planner', label: 'Route Planner', icon: Map, description: 'Plan EV routes' },
  { id: 'training', label: 'Training', icon: Brain, description: 'Model training' },
  { id: 'analytics', label: 'Analytics', icon: Activity, description: 'Performance data' },
];

function Sidebar() {
  const {
    activeTab, setActiveTab,
    sidebarCollapsed, toggleSidebar,
    mobileSidebarOpen, setMobileSidebarOpen,
  } = useSystemStore();

  // Keyboard navigation state
  const navButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const key = e.key;
    const currentIndex = navButtonRefs.current.findIndex((ref) => ref === document.activeElement);
    let nextIndex = currentIndex;

    if (key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0;
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1;
    } else if (key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (key === 'End') {
      e.preventDefault();
      nextIndex = menuItems.length - 1;
    } else if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      if (currentIndex >= 0 && navButtonRefs.current[currentIndex]) {
        navButtonRefs.current[currentIndex]?.click();
      }
      return;
    } else {
      return;
    }

    navButtonRefs.current[nextIndex]?.focus();
  };

  // Mobile overlay Escape handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileSidebarOpen) {
        setMobileSidebarOpen(false);
      }
    };

    if (mobileSidebarOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [mobileSidebarOpen, setMobileSidebarOpen]);

  const navContent = (
    <>
      <nav
        className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar"
        role="navigation"
        aria-label="Main navigation"
        onKeyDown={handleKeyDown}
      >
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              ref={(el) => (navButtonRefs.current[index] = el)}
              onClick={() => setActiveTab(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
              tabIndex={index === 0 ? 0 : -1}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group w-full flex items-center gap-3 rounded-xl font-medium transition-all duration-200 relative',
                sidebarCollapsed ? 'justify-center px-3 py-3' : 'px-3 py-2.5',
                isActive
                  ? 'bg-emerald text-white shadow-md shadow-emerald/20'
                  : 'text-label hover:bg-surface-hover hover:text-white',
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald rounded-r-full -ml-3" />
              )}

              <Icon className={cn('w-5 h-5 flex-shrink-0', isActive ? '' : 'group-hover:scale-110 transition-transform')} />

              {!sidebarCollapsed && (
                <div className="flex-1 text-left min-w-0">
                  <span className="block text-sm leading-tight">{item.label}</span>
                  {!isActive && (
                    <span className="block text-[10px] text-label truncate">
                      {item.description}
                    </span>
                  )}
                </div>
              )}

              {!sidebarCollapsed && isActive && (
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle (Desktop) */}
      {!mobileSidebarOpen && (
        <div className="hidden lg:block px-3 py-2 border-t border-white/[0.06]">
          <button
            onClick={toggleSidebar}
            aria-expanded={!sidebarCollapsed}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-label hover:bg-surface-hover"
          >
            <ChevronLeft className={cn('w-4 h-4 transition-transform duration-300', sidebarCollapsed && 'rotate-180')} />
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>
      )}

      {/* Footer Info */}
      {!sidebarCollapsed && (
        <div className="px-4 py-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-3.5 h-3.5 text-emerald" />
            <span className="text-[11px] font-semibold text-label uppercase tracking-wider">AI Stack</span>
          </div>
          <div className="space-y-1.5">
            {['GNN Route Generator', 'SG-GAN Traffic', 'Q-Learning Agent'].map((item) => (
              <div key={item} className="flex items-center gap-2 text-[11px] text-label">
                <div className="w-1 h-1 rounded-full bg-emerald/60" />
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col sticky top-16 h-[calc(100vh-4rem)] bg-midnight/80 backdrop-blur-xl',
          'border-r border-white/[0.06] transition-all duration-300',
          sidebarCollapsed ? 'w-[72px]' : 'w-[260px]',
        )}
      >
        {navContent}
      </aside>

      {/* Mobile Overlay */}
      {mobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setMobileSidebarOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <aside
            className="w-72 h-full bg-midnight border-r border-white/[0.05] shadow-elevated flex flex-col animate-slide-in-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.05]">
              <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald to-amber flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white">Navigation</span>
              </div>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:bg-surface-hover"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}

export default Sidebar;
