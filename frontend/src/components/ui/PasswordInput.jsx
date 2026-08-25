import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * PasswordInput — press-and-hold to reveal password.
 * Drop-in replacement for <Input> or standard <input> for password fields.
 *
 * Requirements fulfilled:
 *   - Eye icon placed inside the password field on the right side.
 *   - type="password" by default.
 *   - Press and hold (pointer/touch/keyboard) temporarily changes to type="text".
 *   - Releasing immediately reverts back to type="password".
 *   - NOT a click-to-toggle feature.
 *   - Supports desktop mouse, mobile touch, and pointer events:
 *       onPointerDown -> show
 *       onPointerUp -> hide
 *       onPointerLeave -> hide
 *       onPointerCancel -> hide
 *   - Window blur -> hide.
 *   - Prevents text selection, dragging, and focus loss during hold.
 *   - Preserves cursor and input value.
 *   - Open-eye icon (Eye) when visible, closed-eye icon (EyeOff) when hidden.
 *   - Accessible aria-label="Hold to show password".
 *   - Keyboard support: holding Space or Enter reveals; releasing hides.
 */
export const PasswordInput = React.forwardRef(
  (
    {
      label,
      error,
      helperText,
      icon: Icon,
      className = '',
      inputClassName = '',
      containerClassName = '',
      labelClassName = '',
      id,
      buttonClassName = '',
      ...props
    },
    ref
  ) => {
    const [visible, setVisible] = useState(false);
    const holdingRef = useRef(false);
    const generatedId = React.useId();
    const inputId = id || `pw-input-${generatedId.replace(/:/g, '')}`;
    const messageId = `${inputId}-${error ? 'error' : 'help'}`;

    const show = useCallback(() => {
      holdingRef.current = true;
      setVisible(true);
    }, []);

    const hide = useCallback(() => {
      holdingRef.current = false;
      setVisible(false);
    }, []);

    // Hide if browser window loses focus
    useEffect(() => {
      const handleWindowBlur = () => {
        hide();
      };
      window.addEventListener('blur', handleWindowBlur);
      return () => {
        window.removeEventListener('blur', handleWindowBlur);
      };
    }, [hide]);

    // Keyboard support: holding Space or Enter reveals; releasing hides
    const handleKeyDown = useCallback(
      (e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !holdingRef.current) {
          e.preventDefault();
          show();
        }
      },
      [show]
    );

    const handleKeyUp = useCallback(
      (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          hide();
        }
      },
      [hide]
    );

    return (
      <div className={twMerge('w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className={twMerge(
              'block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider',
              labelClassName
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 z-10">
              <Icon size={15} />
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            type={visible ? 'text' : 'password'}
            autoComplete="off"
            aria-invalid={Boolean(error)}
            aria-describedby={(error || helperText) ? messageId : undefined}
            className={twMerge(
              clsx(
                'w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900',
                'placeholder:text-slate-400',
                'focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15',
                'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
                'transition-colors duration-150',
                Icon ? 'pl-9 pr-10' : 'pr-10',
                error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : '',
                inputClassName,
                className
              )
            )}
            {...props}
          />

          <button
            type="button"
            aria-label="Hold to show password"
            aria-pressed={visible}
            tabIndex={0}
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              e.preventDefault();
              show();
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch (_) {}
            }}
            onPointerUp={(e) => {
              hide();
              try {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
              } catch (_) {}
            }}
            onPointerLeave={hide}
            onPointerCancel={hide}
            onLostPointerCapture={hide}
            onBlur={hide}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onContextMenu={(e) => e.preventDefault()}
            onSelectStart={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            className={twMerge(
              'absolute inset-y-0 right-0 flex items-center justify-center w-10 text-slate-400 hover:text-indigo-600 focus:outline-none focus:text-indigo-600 transition-colors duration-150 cursor-pointer select-none z-10',
              buttonClassName
            )}
            style={{
              userSelect: 'none',
              WebkitUserSelect: 'none',
              touchAction: 'none',
            }}
          >
            {visible ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>

        {error && (
          <p id={messageId} role="alert" className="mt-1 text-xs text-red-600 font-medium">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={messageId} className="mt-1 text-xs text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
