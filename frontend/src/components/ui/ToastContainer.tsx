import { useState } from 'react';
import { useToasts, Toast } from '../../store/store';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

const iconMap: Record<Toast['type'], React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap: Record<Toast['type'], string> = {
  success: 'border-l-emerald bg-emerald-dim',
  error: 'border-l-rose bg-rose-dim',
  warning: 'border-l-amber bg-amber-dim',
  info: 'border-l-blue bg-blue-dim',
};

const iconColorMap: Record<Toast['type'], string> = {
  success: 'text-emerald',
  error: 'text-rose',
  warning: 'text-amber',
  info: 'text-blue',
};

function ToastContainer() {
  const { toasts, removeToast } = useToasts();
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());

  if (toasts.length === 0) return null;

  const handleDismiss = (id: string) => {
    // Mark as dismissing to trigger exit animation
    setDismissing((prev) => new Set(prev).add(id));
  };

  const handleAnimationEnd = (e: React.AnimationEvent, id: string) => {
    // Only remove if the exit animation completed
    if (e.animationName.includes('slideOutRight')) {
      removeToast(id);
      setDismissing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        const isDismissing = dismissing.has(toast.id);

        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border-l-4 shadow-elevated relative overflow-hidden',
              'bg-[#0a0f16]/60 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
              isDismissing ? 'animate-slide-out-right' : 'animate-slide-in-right',
              colorMap[toast.type],
            )}
            role={toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status'}
            onAnimationEnd={(e) => handleAnimationEnd(e, toast.id)}
          >
            <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', iconColorMap[toast.type])} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">
                {toast.title}
              </p>
              {toast.message && (
                <p className="text-xs text-label mt-0.5 line-clamp-2">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              onClick={() => handleDismiss(toast.id)}
              className="flex-shrink-0 p-1 rounded-md text-label hover:text-white hover:bg-surface-hover"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Progress bar */}
            <div
              className="absolute bottom-0 left-0 h-0.5 bg-current opacity-30"
              style={{
                animation: `toastProgress ${toast.duration || 4000}ms linear`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;
