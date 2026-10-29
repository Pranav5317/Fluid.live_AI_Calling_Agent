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
    <div className={`flex flex-col items-center justify-center p-10 text-center rounded-[22px] border border-dashed border-white/[0.12] bg-white/[0.02] ${className || ''}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.05] border border-white/[0.08] text-indigo-400 mb-3 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
        {icon || <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
      <p className="mt-1 text-xs text-slate-400 max-w-sm">{description}</p>
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

