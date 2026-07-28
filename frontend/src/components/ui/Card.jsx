import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Card = ({ children, className = '', interactive = false, ...props }) => {
  return (
    <div
      className={twMerge(
        clsx(
          'rounded-xl p-5',
          interactive ? 'glass-panel-interactive' : 'glass-panel',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
