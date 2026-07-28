import { useEffect } from 'react';

// Global state to handle multiple overlapping / nested modals cleanly
let modalCount = 0;
let originalScrollY = 0;
let originalStyle = {};

/**
 * Custom Hook: useScrollLock
 * Automatically locks background page scrolling when a modal/popup is open,
 * and seamlessly restores exact scroll position when all modals are closed.
 * 
 * @param {boolean} isOpen - Whether the modal or popup is currently active
 */
export const useScrollLock = (isOpen) => {
  useEffect(() => {
    if (!isOpen) return;

    // First modal to open -> snapshot scroll position & apply lock styles
    if (modalCount === 0) {
      originalScrollY = window.scrollY || window.pageYOffset || 0;

      // Calculate scrollbar width to prevent background layout jump
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      // Save inline styles before modifying
      originalStyle = {
        overflow: document.body.style.overflow,
        position: document.body.style.position,
        top: document.body.style.top,
        left: document.body.style.left,
        width: document.body.style.width,
        paddingRight: document.body.style.paddingRight,
        touchAction: document.body.style.touchAction,
      };

      // Apply body scroll lock
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${originalScrollY}px`;
      document.body.style.left = '0';
      document.body.style.width = '100%';
      document.body.style.touchAction = 'none';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    modalCount += 1;

    // Prevent arrow keys, space, page up/down scrolling on document when modal is open
    const handleKeyDown = (e) => {
      const keysToBlock = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Space', 'Home', 'End', ' '];
      const isInputOrTextarea = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if (keysToBlock.includes(e.key) && !isInputOrTextarea) {
        // If event origin is outside the scrollable modal container, prevent scroll
        const isInsideModalContent = e.target.closest('[data-modal-content="true"]');
        if (!isInsideModalContent) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });

    return () => {
      modalCount = Math.max(0, modalCount - 1);

      window.removeEventListener('keydown', handleKeyDown);

      // Last modal to close -> restore background styles & scroll position
      if (modalCount === 0) {
        document.body.style.overflow = originalStyle.overflow || '';
        document.body.style.position = originalStyle.position || '';
        document.body.style.top = originalStyle.top || '';
        document.body.style.left = originalStyle.left || '';
        document.body.style.width = originalStyle.width || '';
        document.body.style.paddingRight = originalStyle.paddingRight || '';
        document.body.style.touchAction = originalStyle.touchAction || '';

        window.scrollTo(0, originalScrollY);
      }
    };
  }, [isOpen]);
};

export default useScrollLock;
