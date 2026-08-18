import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

// Auto-recover from dynamic chunk load errors during new deployments
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error detected. Reloading page to fetch latest build chunks...', event);
  const lastReload = sessionStorage.getItem('last_chunk_reload');
  const now = Date.now();
  if (!lastReload || now - Number(lastReload) > 10000) {
    sessionStorage.setItem('last_chunk_reload', String(now));
    window.location.reload();
  }
});

window.addEventListener('error', (event) => {
  if (
    event.message &&
    (event.message.includes('Failed to fetch dynamically imported module') ||
     event.message.includes('Loading chunk') ||
     event.message.includes('dynamically imported module'))
  ) {
    console.warn('Dynamic import chunk error detected. Reloading to get latest assets...', event.message);
    const lastReload = sessionStorage.getItem('last_chunk_reload');
    const now = Date.now();
    if (!lastReload || now - Number(lastReload) > 10000) {
      sessionStorage.setItem('last_chunk_reload', String(now));
      window.location.reload();
    }
  }
});

// Prevent accidental scroll-wheel value modifications on number inputs across all forms
window.addEventListener(
  'wheel',
  () => {
    if (document.activeElement && document.activeElement.type === 'number') {
      document.activeElement.blur();
    }
  },
  { passive: true }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
