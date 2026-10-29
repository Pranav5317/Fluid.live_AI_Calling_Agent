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
        'rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_6px_18px_rgba(15,23,42,0.02)] flex flex-col justify-between transition-all duration-200 hover:border-indigo-300/60 hover:shadow-md',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
          {title}
        </span>
        {icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50/80 border border-indigo-100 text-indigo-600 shadow-sm">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
          {value}
        </div>

        {(trendPercentage !== undefined || description) && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {trendPercentage !== undefined && (
              <span
                className={cn(
                  'inline-flex items-center font-bold rounded-full px-2 py-0.5 text-[11px] font-mono shadow-[0_1px_2px_rgba(0,0,0,0.02)]',
                  isPositive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                    : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                )}
              >
                {isPositive ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3" />
                )}
                {isPositive ? '+' : ''}
                {trendPercentage}%
              </span>
            )}
            <span className="text-slate-500">
              {description || trendLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

