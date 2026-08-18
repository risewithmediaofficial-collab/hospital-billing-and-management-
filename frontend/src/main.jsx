import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

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
    <App />
  </React.StrictMode>
);
