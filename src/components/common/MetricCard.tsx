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
        'rounded-lg border border-slate-200 bg-white p-5 shadow-subtle flex flex-col justify-between transition-all hover:border-slate-300',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-700">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl font-bold text-slate-900 tracking-tight">
          {value}
        </div>

        {(trendPercentage !== undefined || description) && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {trendPercentage !== undefined && (
              <span
                className={cn(
                  'inline-flex items-center font-semibold rounded px-1.5 py-0.5',
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

