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
    <div className={`flex flex-col items-center justify-center p-12 text-slate-500 ${className || ''}`}>
      <Loader2 className="h-6 w-6 animate-spin text-slate-700 mb-2" />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
};

