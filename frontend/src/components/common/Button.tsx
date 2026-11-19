import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none cursor-pointer';

    const variants = {
      primary:
        'bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:shadow-sm font-semibold active:bg-blue-800',
      secondary:
        'bg-white text-slate-800 hover:bg-slate-50 active:bg-slate-100 border border-slate-200 hover:border-slate-300 shadow-2xs font-semibold',
      outline:
        'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/90 hover:border-slate-300 shadow-2xs font-semibold',
      danger:
        'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 shadow-2xs font-semibold',
      ghost:
        'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs font-semibold gap-1.5',
      md: 'px-4 py-2 text-sm font-semibold gap-2',
      lg: 'px-5 py-2.5 text-base font-semibold gap-2.5',
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-current" />
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
