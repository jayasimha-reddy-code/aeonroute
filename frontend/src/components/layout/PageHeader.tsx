import React from 'react';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}

function PageHeader({ title, subtitle, icon: Icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 lg:mb-10', className)}>
      <div className="flex items-center gap-3.5">
        {Icon && (
          <div className="w-11 h-11 rounded-full bg-emerald/10 border border-emerald/20 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <Icon className="w-5 h-5 text-emerald" />
          </div>
        )}
        <div>
          <h2 className="text-2xl sm:text-[1.75rem] leading-tight font-bold text-white tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[13px] text-slate-400 mt-1 font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

export default PageHeader;
