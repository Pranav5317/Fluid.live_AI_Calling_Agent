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
      'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#F5EADB] focus:ring-[#1D4ED8]/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none cursor-pointer';

    const variants = {
      primary:
        'bg-[#1D4ED8] hover:bg-[#1E40AF] text-white shadow-[0_8px_20px_rgba(29,78,216,0.35)] font-semibold',
      secondary:
        'bg-white/70 text-slate-800 hover:bg-white active:bg-white/90 border border-[#D5C4AC] shadow-xs font-semibold',
      outline:
        'bg-white/50 text-slate-800 hover:bg-white border border-[#D5C4AC] shadow-xs font-semibold',
      danger:
        'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 shadow-xs font-semibold',
      ghost:
        'bg-transparent text-slate-700 hover:bg-black/5 hover:text-slate-950',
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
