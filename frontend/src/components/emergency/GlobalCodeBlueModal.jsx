import React from 'react';
import { useSocket } from '../../providers/SocketProvider';
import { useScrollLock } from '../../hooks/useScrollLock';
import { AlertOctagon, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';

export const GlobalCodeBlueModal = () => {
  const { activeCodeBlue, dismissCodeBlue } = useSocket();
  useScrollLock(Boolean(activeCodeBlue));

  if (!activeCodeBlue) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-lg animate-fade-in">
      <div className="max-w-md w-full glass-panel border-2 border-red-500 rounded-2xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.5)] emergency-pulse text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 mx-auto flex items-center justify-center mb-4 border border-red-500/40 animate-bounce">
          <AlertOctagon size={36} />
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-red-500 text-white shadow-lg shadow-red-500/50">
          Emergency Code Blue Activated
        </span>

        <h2 className="text-2xl font-black text-white mt-3">
          {activeCodeBlue.location || 'ICU Ward - Room 304'}
        </h2>

        <p className="text-slate-300 text-sm mt-2">
          Patient Resuscitation Emergency Alert triggered by <span className="font-bold text-white">{activeCodeBlue.triggeredBy || 'Ward Nurse'}</span>
        </p>

        <div className="mt-4 p-3 rounded-lg bg-slate-950/80 border border-red-500/30 text-left text-xs space-y-1">
          <p><span className="text-slate-400">Trigger Time:</span> <span className="text-slate-200 font-mono">{new Date().toLocaleTimeString()}</span></p>
          <p><span className="text-slate-400">Location:</span> <span className="text-slate-200 font-bold">{activeCodeBlue.location || 'Bed 04'}</span></p>
          <p><span className="text-slate-400">Status:</span> <span className="text-red-400 font-bold">CRITICAL BROADCAST ACTIVE</span></p>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button variant="danger" className="flex-1 py-3 text-base font-bold shadow-lg shadow-red-600/50" onClick={dismissCodeBlue}>
            <CheckCircle2 size={20} />
            Accept & En-Route
          </Button>
        </div>
      </div>
    </div>
  );
};
