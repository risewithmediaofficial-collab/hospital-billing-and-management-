import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled = false,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] cursor-pointer select-none';

  const variants = {
    // Professional indigo-blue primary
    primary:
      'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white border border-indigo-600 hover:border-indigo-700 shadow-sm',

    // Danger — red for destructive actions
    danger:
      'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border border-red-600 shadow-sm',

    // Success — emerald for positive actions
    success:
      'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border border-emerald-600 shadow-sm',

    // Secondary — light indigo tint
    secondary:
      'bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700 border border-indigo-200',

    // Outline — white bg, grey border
    outline:
      'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 hover:border-slate-400',

    // Glass — elevated white, subtle shadow
    glass:
      'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm hover:shadow',

    // Warning — amber
    warning:
      'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white border border-amber-500 shadow-sm',
  };

  const sizes = {
    xs: 'text-xs px-2.5 py-1 gap-1',
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-sm px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      className={twMerge(clsx(base, variants[variant], sizes[size], className))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin -ml-0.5 h-3.5 w-3.5 text-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading…
        </>
      ) : (
        children
      )}
    </button>
  );
};
