import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, Wrench, ShieldAlert, AlertTriangle } from 'lucide-react';

export const ReportMaintenanceModal = ({ isOpen, onClose, bed = null, onSuccess }) => {
  useScrollLock(isOpen);
  const [issue, setIssue] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !bed) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!issue.trim()) {
      setError('Please describe the issue or malfunction.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await axiosClient.post(`/beds/${bed._id}/mark-maintenance`, {
        issue: issue.trim(),
        priority,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg = err.error?.message || err.response?.data?.message || err.message || 'Failed to place bed in maintenance.';
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
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-300 shrink-0">
              <Wrench size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 truncate">
                Report Bed Maintenance Issue
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

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                Marking this bed under maintenance will <strong>lock it from new patient admissions</strong> until repairs are certified complete.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Issue / Malfunction Description *
              </label>
              <textarea
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                rows={3}
                placeholder="e.g. Electric height motor not responding, wheel lock broken, mattress tear, IV pole loose..."
                required
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-900 border border-slate-200 resize-none font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200"
              >
                <option value="LOW">Low (Cosmetic / Minor)</option>
                <option value="MEDIUM">Medium (Standard Repair)</option>
                <option value="HIGH">High (Urgent Repair Required)</option>
                <option value="CRITICAL">Critical (Safety Hazard)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isLoading} className="font-bold bg-slate-800 hover:bg-slate-900">
                Mark In Maintenance
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
