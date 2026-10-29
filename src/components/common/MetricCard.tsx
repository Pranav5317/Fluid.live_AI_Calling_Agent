import React from 'react';
import { cn } from '../../lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  trendPercentage?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  description?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  trendPercentage,
  trendLabel = 'vs last period',
  icon,
  description,
  className,
}) => {
  const isPositive = trendPercentage !== undefined && trendPercentage >= 0;

  return (
    <div
      className={cn(
        'rounded-[22px] border border-white/[0.08] bg-[#0A0E24]/85 backdrop-blur-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col justify-between transition-all duration-300 hover:border-indigo-500/40 hover:shadow-[0_20px_50px_rgba(79,70,229,0.15)] group',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
          {title}
        </span>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-400/25 text-indigo-400 shadow-inner transition-transform group-hover:scale-105">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="text-3xl font-extrabold text-white tracking-tight font-sans">
          {value}
        </div>

        {(trendPercentage !== undefined || description) && (
          <div className="mt-2.5 flex items-center gap-2 text-xs">
            {trendPercentage !== undefined && (
              <span
                className={cn(
                  'inline-flex items-center font-bold rounded-full px-2.5 py-0.5 text-[11px] font-mono border shadow-sm',
                  isPositive
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                )}
              >
                {isPositive ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3" />
                )}
                {isPositive ? `+${trendPercentage}%` : `${trendPercentage}%`}
              </span>
            )}
            <span className="text-[11px] text-slate-400">
              {description || trendLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
