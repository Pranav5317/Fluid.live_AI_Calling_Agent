import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  helperText?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, helperText, error, id, ...props }, ref) => {
    const selectId = id || React.useId();

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 font-mono"
          >
            {label}
          </label>
        )}
        <div className="relative rounded-xl shadow-2xs">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'block w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3.5 pr-9 text-xs sm:text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-2xs cursor-pointer',
              error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/25',
              className
            )}
            {...props}
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-white text-slate-900">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
        {error ? (
          <p className="text-xs text-rose-600 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
