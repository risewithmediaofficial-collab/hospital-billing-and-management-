import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, Sparkles, ShieldCheck, ShieldAlert } from 'lucide-react';

export const MarkCleaningCompleteModal = ({ isOpen, onClose, bed = null, onSuccess }) => {
  useScrollLock(isOpen);
  const [cleanedByName, setCleanedByName] = useState('');
  const [notes, setNotes] = useState('Sanitized with hospital-grade disinfectant, fresh sterilized linen applied');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !bed) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await axiosClient.post(`/beds/${bed._id}/mark-cleaned`, {
        cleanedByName: cleanedByName.trim() || undefined,
        notes: notes.trim(),
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg = err.error?.message || err.response?.data?.message || err.message || 'Failed to certify cleaning.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in z-50">
      <div className="modal-container max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 truncate">
                Housekeeping Sign-Off &amp; Clean Bed
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Bed {bed.bedNumber} ({bed.wardName || 'Ward'})</p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5">
                <ShieldAlert size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
              <ShieldCheck size={16} className="text-emerald-700 shrink-0 mt-0.5" />
              <span>
                Certifying cleaning will immediately update Bed <strong>{bed.bedNumber}</strong> status to <strong className="text-emerald-800">AVAILABLE (🟢)</strong> for new patient admission.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Housekeeping Staff / Sanitizer Name
              </label>
              <Input
                type="text"
                placeholder="Staff Name / Cleaning Team"
                value={cleanedByName}
                onChange={(e) => setCleanedByName(e.target.value)}
                className="w-full text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Sanitization &amp; Linen Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Linen replaced, UV sanitized, bio-hazard check clear..."
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-900 border border-slate-200 resize-none font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isLoading} className="font-bold bg-emerald-600 hover:bg-emerald-700">
                Certify Clean &amp; Release to Available
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
