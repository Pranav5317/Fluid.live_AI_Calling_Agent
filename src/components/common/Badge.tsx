import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'brand';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  ...props
}) => {
  const base = 'inline-flex items-center font-medium rounded-full border transition-all duration-150 select-none shadow-xs';

  const variants = {
    neutral: 'bg-black/5 text-slate-700 border-black/10',
    success: 'bg-emerald-600/10 text-emerald-800 border-emerald-600/20',
    warning: 'bg-amber-600/10 text-amber-900 border-amber-600/20',
    danger: 'bg-rose-600/10 text-rose-800 border-rose-600/20',
    info: 'bg-sky-600/10 text-sky-800 border-sky-600/20',
    purple: 'bg-indigo-600/10 text-indigo-800 border-indigo-600/20',
    brand: 'bg-[#1D4ED8]/10 text-[#1D4ED8] border-[#1D4ED8]/25 font-bold',
  };

  const dotColors = {
    neutral: 'bg-slate-500',
    success: 'bg-emerald-600',
    warning: 'bg-amber-600',
    danger: 'bg-rose-600',
    info: 'bg-sky-600',
    purple: 'bg-indigo-600',
    brand: 'bg-[#1D4ED8]',
  };

  const sizes = {
    sm: 'px-2.5 py-0.5 text-[10px] leading-3 gap-1.5 font-bold font-mono uppercase tracking-wider',
    md: 'px-3 py-1 text-xs leading-4 gap-2 font-medium',
  };

  return (
    <span className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColors[variant])} />}
      {children}
    </span>
  );
};
