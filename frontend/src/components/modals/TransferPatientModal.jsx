import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, ArrowRightLeft, ShieldAlert, CheckCircle2, BedDouble } from 'lucide-react';

export const TransferPatientModal = ({ isOpen, onClose, admission = null, onSuccess }) => {
  useScrollLock(isOpen);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [targetBedId, setTargetBedId] = useState('');
  const [reason, setReason] = useState('');
  const [selectedFilterWard, setSelectedFilterWard] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && admission) {
      setTargetBedId('');
      setReason('');
      setSelectedFilterWard('ALL');
      setError(null);
      fetchAvailableBeds();
    }
  }, [isOpen, admission]);

  const fetchAvailableBeds = async () => {
    try {
      const res = await axiosClient.get('/beds?status=AVAILABLE');
      const data = Array.isArray(res) ? res : (res.data || []);
      setAvailableBeds(data);
    } catch (err) {
      console.error('Failed to load available beds:', err);
    }
  };

  if (!isOpen || !admission) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetBedId) {
      setError('Please select a target destination bed.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a clinical or administrative reason for the transfer.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await axiosClient.post('/beds/transfer-patient', {
        admissionId: admission._id,
        targetBedId,
        reason: reason.trim(),
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg = err.error?.message || err.response?.data?.message || err.message || 'Failed to complete patient transfer.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const uniqueWards = Array.from(new Set(availableBeds.map((b) => b.wardName || 'General Ward'))).filter(Boolean);

  const filteredBeds = selectedFilterWard === 'ALL'
    ? availableBeds
    : availableBeds.filter((b) => (b.wardName || 'General Ward') === selectedFilterWard);

  const selectedBedObj = availableBeds.find((b) => String(b._id) === String(targetBedId));

  return (
    <div className="modal-overlay animate-fade-in z-50">
      <div className="modal-container max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
              <ArrowRightLeft size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 truncate">
                Transfer Inpatient Location
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Patient: <span className="font-bold text-slate-800">{admission.patientName} ({admission.uhid})</span>
              </p>
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

            {/* Current Bed Context */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Current Inpatient Location
              </div>
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span className="flex items-center gap-1.5">
                  <BedDouble size={14} className="text-indigo-600" />
                  Bed {admission.bedNumber || 'Unassigned'}
                </span>
                <span className="text-amber-700">{admission.targetWardName || admission.wardType || 'Ward'}</span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>Room: {admission.roomNumber || 'N/A'}</span>
                <span>Current Tariff: ₹{admission.dailyTariff || 150}/day</span>
              </div>
            </div>

            {/* Destination Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Select Destination Bed ({availableBeds.length} Available) *
                </label>
                {uniqueWards.length > 1 && (
                  <select
                    value={selectedFilterWard}
                    onChange={(e) => setSelectedFilterWard(e.target.value)}
                    className="text-[10px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-0.5"
                  >
                    <option value="ALL">All Wards ({availableBeds.length})</option>
                    {uniqueWards.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {availableBeds.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-center font-semibold">
                  No available beds found in the hospital. Please release or clean a bed first.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200">
                  {filteredBeds.map((b) => (
                    <button
                      key={b._id}
                      type="button"
                      onClick={() => setTargetBedId(b._id)}
                      className={`p-2 rounded-xl text-left border transition-all ${
                        targetBedId === b._id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="font-extrabold text-xs flex items-center justify-between">
                        <span>{b.bedNumber}</span>
                        <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${targetBedId === b._id ? 'bg-blue-700 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
                          ₹{b.dailyTariff}
                        </span>
                      </div>
                      <div className={`text-[10px] truncate mt-0.5 ${targetBedId === b._id ? 'text-blue-100' : 'text-slate-500'}`}>
                        {b.wardName || 'General Ward'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedBedObj && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-900 font-semibold text-xs">
                <span>Selected Destination: <strong>{selectedBedObj.bedNumber}</strong> ({selectedBedObj.wardName})</span>
                <span className="font-bold">New Tariff: ₹{selectedBedObj.dailyTariff}/day</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Reason for Transfer *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="e.g. Upgraded to ICU due to clinical condition, Patient requested private room, Step-down to general ward..."
                required
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-900 border border-slate-200 resize-none font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isLoading} disabled={!targetBedId} className="font-bold bg-blue-600 hover:bg-blue-700">
                Confirm Transfer
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
