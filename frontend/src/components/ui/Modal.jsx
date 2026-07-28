import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useScrollLock } from '../../hooks/useScrollLock';

/**
 * Reusable Global Modal Container Component
 * Automatically handles:
 *  - Background scroll lock & scroll position restoration (via useScrollLock)
 *  - Backdrop click to close (optional)
 *  - Escape key listener
 *  - Layout shift prevention
 */
export const Modal = ({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  icon: Icon,
  maxWidth = 'max-w-2xl',
  closeOnBackdrop = true,
  className = '',
}) => {
  // Lock background scroll when open
  useScrollLock(isOpen);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div
        data-modal-content="true"
        className={`w-full ${maxWidth} glass-panel rounded-2xl p-6 relative border border-slate-800 shadow-2xl my-auto max-h-[88vh] overflow-y-auto ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 shadow-md transition-all z-20"
            aria-label="Close modal"
            title="Close popup"
          >
            <X size={18} />
          </button>
        )}

        {(title || Icon) && (
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-4">
            {Icon && (
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Icon size={22} />
              </div>
            )}
            <div>
              {title && <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
};

export default Modal;
