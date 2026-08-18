import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React application error:', error, errorInfo);
    // If it's a dynamic module import failure (happens during active new deployment), auto-reload
    if (
      error?.message &&
      (error.message.includes('Failed to fetch dynamically imported module') ||
       error.message.includes('Loading chunk'))
    ) {
      const lastReload = sessionStorage.getItem('last_chunk_reload');
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 10000) {
        sessionStorage.setItem('last_chunk_reload', String(now));
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-100">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
              <AlertTriangle size={28} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">Application View Updated</h2>
              <p className="text-xs text-slate-400 mt-1">
                A new version of the hospital management system was deployed or an unexpected view glitch occurred.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-left text-xs font-mono text-rose-300 max-h-24 overflow-y-auto">
              {this.state.error?.message || 'Unknown view exception'}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="py-2.5 px-4 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg"
              >
                <RefreshCw size={14} /> Reload Page
              </button>

              <button
                onClick={this.handleGoHome}
                className="py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Home size={14} /> Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
