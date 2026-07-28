import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Input = React.forwardRef(({ label, error, helperText, icon: Icon, className = '', ...props }, ref) => {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">{label}</label>}
      <div className="relative rounded-lg shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Icon size={18} />
          </div>
        )}
        <input
          ref={ref}
          autoComplete="off"
          className={twMerge(
            clsx(
              'w-full glass-input rounded-lg px-3.5 py-2 text-sm placeholder:text-slate-500 focus:outline-none transition-all duration-200',
              Icon ? 'pl-10' : '',
              error ? 'border-red-500/80 focus:border-red-500 focus:ring-1 focus:ring-red-500' : '',
              className
            )
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      {helperText && !error && <p className="mt-1 text-xs text-slate-400">{helperText}</p>}
    </div>
  );
});

Input.displayName = 'Input';
