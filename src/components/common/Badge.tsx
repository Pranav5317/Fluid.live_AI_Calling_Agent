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
  const base = 'inline-flex items-center font-medium rounded-full border transition-all duration-150 select-none shadow-[0_1px_2px_rgba(0,0,0,0.2)]';

  const variants = {
    neutral: 'bg-white/[0.06] text-slate-300 border-white/[0.12]',
    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    danger: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    info: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    purple: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    brand: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-indigo-400/30 shadow-sm',
  };

  const dotColors = {
    neutral: 'bg-slate-400',
    success: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
    warning: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
    danger: 'bg-rose-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]',
    info: 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]',
    purple: 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]',
    brand: 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]',
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
