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
  const hasTrend = trendPercentage !== undefined && trendPercentage !== 0;
  const isPositive = trendPercentage !== undefined && trendPercentage > 0;

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-4.5 shadow-xs flex flex-col justify-between transition-all duration-150 hover:border-slate-300 hover:shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 truncate">
          {title}
        </span>
        {icon && (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100/80 text-slate-500">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-2.5">
        <div className="text-2xl font-bold text-slate-900 tracking-tight">
          {value}
        </div>

        {(hasTrend || description) && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {hasTrend && (
              <span
                className={cn(
                  'inline-flex items-center font-semibold rounded px-1.5 py-0.5 text-[11px]',
                  isPositive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
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
              {description || (hasTrend ? trendLabel : '')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
