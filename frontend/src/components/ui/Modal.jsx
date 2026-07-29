import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useScrollLock } from '../../hooks/useScrollLock';

/**
 * Reusable Global Modal Container Component
 * - Viewport-safe: never clips beyond screen
 * - Sticky header with always-visible close button
 * - Scrollable body with overflow-y: auto
 * - Optional sticky footer for action buttons
 * - Background scroll lock, backdrop click, and Escape key
 */
export const Modal = ({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  icon: Icon,
  maxWidth = 'max-w-2xl',
  closeOnBackdrop = false,
  className = '',
  footer,
}) => {
  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className={`modal-container w-full ${maxWidth} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        {(title || Icon || onClose) && (
          <div className="modal-header">
            <div className="flex items-center gap-3 min-w-0">
              {Icon && (
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex-shrink-0">
                  <Icon size={19} />
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h3 id="modal-title" className="text-base font-bold text-slate-900 leading-tight truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-slate-500 mt-0.5 font-medium truncate">{subtitle}</p>
                )}
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="modal-close-btn"
                aria-label="Close modal"
                title="Close (Esc)"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Body */}
        <div className="modal-body">{children}</div>

        {/* Optional Sticky Footer */}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
