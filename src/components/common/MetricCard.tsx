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
        'rounded-[22px] border border-[#E5D7C3] bg-[#FAF4EB]/90 backdrop-blur-md p-6 shadow-[0_10px_30px_rgba(40,25,10,0.04)] flex flex-col justify-between transition-all duration-300 hover:border-[#1D4ED8]/40 hover:shadow-[0_12px_35px_rgba(29,78,216,0.08)] group',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
          {title}
        </span>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1D4ED8]/10 border border-[#1D4ED8]/20 text-[#1D4ED8] shadow-xs transition-transform group-hover:scale-105">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="text-3xl font-extrabold text-slate-950 tracking-tight font-sans">
          {value}
        </div>

        {(trendPercentage !== undefined || description) && (
          <div className="mt-2.5 flex items-center gap-2 text-xs">
            {trendPercentage !== undefined && (
              <span
                className={cn(
                  'inline-flex items-center font-bold rounded-full px-2.5 py-0.5 text-[11px] font-mono border shadow-2xs',
                  isPositive
                    ? 'bg-emerald-600/10 text-emerald-800 border-emerald-600/20'
                    : 'bg-rose-600/10 text-rose-800 border-rose-600/20'
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
            <span className="text-[11px] text-slate-500">
              {description || trendLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
