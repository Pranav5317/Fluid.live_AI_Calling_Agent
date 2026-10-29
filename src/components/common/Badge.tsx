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
  const base = 'inline-flex items-center font-medium rounded-full border transition-all duration-150 select-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]';

  const variants = {
    neutral: 'bg-slate-50 text-slate-700 border-slate-200/90',
    success: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/90',
    warning: 'bg-amber-50/80 text-amber-800 border-amber-200/90',
    danger: 'bg-rose-50/80 text-rose-800 border-rose-200/90',
    info: 'bg-sky-50/80 text-sky-800 border-sky-200/90',
    purple: 'bg-indigo-50/80 text-indigo-800 border-indigo-200/90',
    brand: 'bg-slate-900 text-white border-slate-900 shadow-sm',
  };

  const dotColors = {
    neutral: 'bg-slate-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
    purple: 'bg-indigo-500',
    brand: 'bg-brand-300',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px] leading-3 gap-1 font-semibold',
    md: 'px-2.5 py-1 text-xs leading-4 gap-1.5 font-medium',
  };

  return (
    <span className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
};

