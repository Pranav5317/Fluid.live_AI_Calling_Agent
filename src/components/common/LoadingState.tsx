import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = 'Loading data...',
  className,
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-slate-400 ${className || ''}`}>
      <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mb-3" />
      <span className="text-xs font-medium font-mono text-slate-300">{label}</span>
    </div>
  );
};

