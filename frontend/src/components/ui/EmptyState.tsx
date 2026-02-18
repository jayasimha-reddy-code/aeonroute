import { cn } from '../../lib/utils';
import { LucideIcon, Inbox } from 'lucide-react';
import Button from './Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in', className)}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5">
        <Icon className="w-8 h-8 text-white/[0.10]" />
      </div>
      <h3 className="text-lg font-medium text-label mb-1.5">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted max-w-sm mb-6">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
