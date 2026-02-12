import { useState } from 'react';
import { useToasts, Toast } from '../store/store';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../lib/utils';

const iconMap: Record<Toast['type'], React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap: Record<Toast['type'], string> = {
  success: 'border-l-success-500 bg-success-50 dark:bg-success-900/20',
  error: 'border-l-danger-500 bg-danger-50 dark:bg-danger-900/20',
  warning: 'border-l-warning-500 bg-warning-50 dark:bg-warning-900/20',
  info: 'border-l-info-500 bg-info-50 dark:bg-info-900/20',
};

const iconColorMap: Record<Toast['type'], string> = {
  success: 'text-success-600 dark:text-success-400',
  error: 'text-danger-600 dark:text-danger-400',
  warning: 'text-warning-600 dark:text-warning-400',
  info: 'text-info-600 dark:text-info-400',
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
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        const isDismissing = dismissing.has(toast.id);

        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border-l-4 shadow-elevated',
              'bg-white dark:bg-surface-800',
              isDismissing ? 'animate-slide-out-right' : 'animate-slide-in-right',
              colorMap[toast.type],
            )}
            role="alert"
            onAnimationEnd={(e) => handleAnimationEnd(e, toast.id)}
          >
            <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', iconColorMap[toast.type])} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                {toast.title}
              </p>
              {toast.message && (
                <p className="text-xs text-surface-600 dark:text-surface-400 mt-0.5 line-clamp-2">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              onClick={() => handleDismiss(toast.id)}
              className="flex-shrink-0 p-1 rounded-md text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;
