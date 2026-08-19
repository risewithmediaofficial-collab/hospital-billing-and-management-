import React, { useState, useEffect } from 'react';
import { ScratchPod } from './ScratchPod';
import { FileText, X, Sparkles, StickyNote } from 'lucide-react';

export const FloatingScratchPodWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [noteCount, setNoteCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      try {
        const saved = localStorage.getItem('hospital_scratchpad_notes');
        if (saved) {
          const notes = JSON.parse(saved);
          setNoteCount(notes.length);
        }
      } catch (e) {
        setNoteCount(0);
      }
    };
    updateCount();
    const interval = setInterval(updateCount, 2000);
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-scratchpad-modal', handleOpen);
    return () => {
      clearInterval(interval);
      window.removeEventListener('open-scratchpad-modal', handleOpen);
    };
  }, []);

  return (
    <>
      {/* Floating Action Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-slate-900 text-white shadow-2xl border border-slate-700 hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 group"
        title="Open Clinical Scratch Pod & Notes"
      >
        <div className="relative">
          <StickyNote size={22} className="text-amber-400 group-hover:rotate-12 transition-transform" />
          {noteCount > 0 && (
            <span className="absolute -top-2 -right-2.5 w-5 h-5 rounded-full bg-sky-500 text-slate-950 font-black text-[10px] flex items-center justify-center border-2 border-slate-900">
              {noteCount}
            </span>
          )}
        </div>
        <span className="hidden sm:inline font-black text-xs pr-1 tracking-tight">Clinical Scratch Pod</span>
      </button>

      {/* Slide-over / Modal Container when open */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-5xl my-auto max-h-[92vh] overflow-y-auto rounded-3xl bg-white text-black border border-slate-200 shadow-2xl relative p-1">
            <ScratchPod isModal={true} onClose={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
};
