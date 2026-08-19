import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, Clock, ShieldAlert, BookmarkCheck } from 'lucide-react';

export const ReserveBedModal = ({ isOpen, onClose, bed = null, onSuccess }) => {
  useScrollLock(isOpen);
  const [patientName, setPatientName] = useState('');
  const [uhid, setUhid] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [reason, setReason] = useState('Incoming emergency/elective inpatient reservation');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !bed) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await axiosClient.post(`/beds/${bed._id}/reserve`, {
        patientName: patientName.trim(),
        uhid: uhid.trim().toUpperCase(),
        durationMinutes: Number(durationMinutes) || 30,
        reason: reason.trim(),
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg = err.error?.message || err.response?.data?.message || err.message || 'Failed to reserve bed.';
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
              <BookmarkCheck size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 truncate">
                Reserve Bed {bed.bedNumber}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{bed.wardName || 'General Ward'}</p>
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

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 space-y-1 text-xs">
              <div className="font-bold flex items-center gap-1.5">
                <Clock size={14} className="text-amber-700" />
                Temporary Hold Expiry Timer
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Bed will be temporarily held. If admission is not confirmed within the duration, the hold will automatically expire and release back to Available.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Patient Name (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. John Doe"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                UHID / Patient ID (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. UHID-2026-0001"
                value={uhid}
                onChange={(e) => setUhid(e.target.value.toUpperCase())}
                className="w-full text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Reservation Duration (Minutes)
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes (Recommended)</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>1 Hour (60 Minutes)</option>
                <option value={120}>2 Hours (120 Minutes)</option>
                <option value={240}>4 Hours (240 Minutes)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Reservation Reason
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="En-route from casualty, post-op recovery scheduled..."
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-900 border border-slate-200 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isLoading} className="font-bold bg-amber-600 hover:bg-amber-700">
                Reserve Bed
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
