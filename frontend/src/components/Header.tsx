import { useEffect, useState } from 'react';
import { useSidebar, usePresentationMode } from '../store/store';
import { Zap, Menu, Wifi, WifiOff, Bell, Presentation } from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../services/api';

function Header() {
  const { setMobileSidebarOpen } = useSidebar();
  const { presentationMode } = usePresentationMode();
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
    <header className="sticky top-0 z-50 glass border-b border-white/[0.06]">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Left — Logo + Mobile Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-xl text-label hover:bg-surface-hover"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-emerald to-amber flex items-center justify-center shadow-lg shadow-emerald/25">
              <Zap className="w-5 h-5 text-white" />
              <div className="absolute inset-0 rounded-xl bg-emerald/20 animate-pulse-glow" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold tracking-tight text-white leading-none">
                EV Routing
              </h1>
              <p className="text-[10px] font-semibold text-emerald/50 tracking-wider uppercase">
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
                ? 'bg-emerald/10 border-emerald/20 text-emerald'
                : 'bg-rose/10 border-rose/20 text-rose',
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
          <div className={cn('sm:hidden w-2.5 h-2.5 rounded-full', isOnline ? 'bg-emerald' : 'bg-rose')} />

          {/* Presentation Mode Indicator */}
          {presentationMode && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald/10 text-emerald border border-emerald/20 animate-fade-in">
              <Presentation className="w-3.5 h-3.5" />
              Presenting
            </span>
          )}

          {/* Notification Button */}
          <button
            className="relative p-2 rounded-xl text-label hover:bg-surface-hover"
            aria-label="Notifications"
          >
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
