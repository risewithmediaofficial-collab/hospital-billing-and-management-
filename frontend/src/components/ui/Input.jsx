import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Input = React.forwardRef(
  ({ label, error, helperText, icon: Icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Icon size={15} />
            </div>
          )}
          <input
            ref={ref}
            autoComplete="off"
            className={twMerge(
              clsx(
                'w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900',
                'placeholder:text-slate-400',
                'focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15',
                'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
                'transition-colors duration-150',
                Icon ? 'pl-9' : '',
                error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : '',
                className
              )
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
