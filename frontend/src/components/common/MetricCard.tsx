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
        'rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between transition-all duration-200 hover:border-slate-300 hover:shadow-sm group',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
          {title}
        </span>
        {icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-600 shadow-2xs transition-transform group-hover:scale-105">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight font-sans">
          {value}
        </div>

        {(trendPercentage !== undefined || description) && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            {trendPercentage !== undefined && (
              <span
                className={cn(
                  'inline-flex items-center font-bold rounded-md px-2 py-0.5 text-[10px] font-mono border shadow-2xs',
                  isPositive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
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
