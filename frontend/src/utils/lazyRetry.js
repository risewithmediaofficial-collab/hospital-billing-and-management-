import React from 'react';

/**
 * Robust lazy import wrapper with auto-reload retry.
 * Handles Vite chunk hash mismatches during new deployments.
 */
export const lazyRetry = (componentImport) =>
  React.lazy(async () => {
    try {
      const module = await componentImport();
      // On successful import, reset the retry flag
      window.sessionStorage.removeItem('chunk_retry_in_progress');
      return module;
    } catch (error) {
      console.warn('Lazy chunk load failed, checking for deployment update:', error);
      const isRetrying = window.sessionStorage.getItem('chunk_retry_in_progress');
      
      // If we haven't retried yet in this navigation attempt, force a clean window reload
      if (!isRetrying) {
        window.sessionStorage.setItem('chunk_retry_in_progress', 'true');
        window.location.reload();
        return new Promise(() => {}); // Hold until reload
      }

      // If already retried and still failing, throw to ErrorBoundary
      window.sessionStorage.removeItem('chunk_retry_in_progress');
      throw error;
    }
  });

export default lazyRetry;
