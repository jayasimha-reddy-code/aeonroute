import { useEffect, useState } from 'react';
import { useTheme, useSidebar } from '../store/store';
import { Sun, Moon, Monitor, Zap, Menu, Wifi, WifiOff, Bell } from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../services/api';

function Header() {
  const { themeMode, cycleTheme } = useTheme();
  const { setMobileSidebarOpen } = useSidebar();
  const [isOnline, setIsOnline] = useState(false);

  // Poll backend health
  useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      try {
        await api.healthCheck();
        if (mounted) setIsOnline(true);
      } catch {
        if (mounted) setIsOnline(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return (
    <header className="sticky top-0 z-50 glass border-b border-surface-200/40 dark:border-white/[0.06]">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Left — Logo + Mobile Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-xl text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800/60 transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
              <Zap className="w-5 h-5 text-white" />
              <div className="absolute inset-0 rounded-xl bg-primary-500/20 animate-pulse-glow" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold tracking-tight text-surface-900 dark:text-white leading-none">
                EV Routing
              </h1>
              <p className="text-[10px] font-semibold text-primary-600/60 dark:text-primary-400/50 tracking-wider uppercase">
                AI Route Optimizer
              </p>
            </div>
          </div>
        </div>

        {/* Right — Status + Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* System Status */}
          <div
            className={cn(
              'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
              isOnline
                ? 'bg-success-500/10 border-success-500/20 text-success-600 dark:text-success-400'
                : 'bg-danger-500/10 border-danger-500/20 text-danger-600 dark:text-danger-400',
            )}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>System Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline</span>
              </>
            )}
          </div>

          {/* Mobile-only status dot */}
          <div className={cn('sm:hidden w-2.5 h-2.5 rounded-full', isOnline ? 'bg-success-500' : 'bg-danger-500')} />

          {/* Notification Button */}
          <button
            className="relative p-2 rounded-xl text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={cycleTheme}
            className="p-2 rounded-xl text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-300"
            aria-label={`Theme: ${themeMode}. Click to switch`}
          >
            <div className="relative w-[18px] h-[18px]">
              <Sun
                className={cn(
                  'absolute inset-0 w-[18px] h-[18px] text-amber-500 transition-all duration-300',
                  themeMode === 'light' ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0',
                )}
              />
              <Moon
                className={cn(
                  'absolute inset-0 w-[18px] h-[18px] text-surface-600 transition-all duration-300',
                  themeMode === 'dark' ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0',
                )}
              />
              <Monitor
                className={cn(
                  'absolute inset-0 w-[18px] h-[18px] text-primary-500 transition-all duration-300',
                  themeMode === 'system' ? 'rotate-0 scale-100 opacity-100' : 'rotate-180 scale-0 opacity-0',
                )}
              />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
