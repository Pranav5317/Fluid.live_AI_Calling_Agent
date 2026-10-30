import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-10 text-center rounded-[22px] border border-dashed border-[#DFCDB6] bg-[#FAF4EB]/60 ${className || ''}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1D4ED8]/10 border border-[#1D4ED8]/20 text-[#1D4ED8] mb-3 shadow-xs">
        {icon || <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="text-sm font-bold text-slate-950 tracking-tight">{title}</h3>
      <p className="mt-1 text-xs text-slate-600 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

