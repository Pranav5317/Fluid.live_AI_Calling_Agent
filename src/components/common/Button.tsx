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
      'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#060814] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none cursor-pointer';

    const variants = {
      primary:
        'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-500 text-white hover:brightness-110 shadow-[0_10px_25px_-8px_rgba(79,70,229,0.7)] border border-indigo-400/30 font-semibold',
      secondary:
        'bg-white/[0.08] text-slate-100 hover:bg-white/[0.14] active:bg-white/[0.18] border border-white/[0.14] shadow-sm font-semibold',
      outline:
        'bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] hover:text-white border border-white/[0.14] shadow-sm font-medium',
      danger:
        'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 shadow-sm font-semibold',
      ghost:
        'bg-transparent text-slate-400 hover:bg-white/[0.06] hover:text-white',
    };

    const sizes = {
      sm: 'px-4 py-1.5 text-xs font-semibold gap-1.5',
      md: 'px-5 py-2 text-sm font-semibold gap-2',
      lg: 'px-6 py-2.5 text-base font-semibold gap-2.5',
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
