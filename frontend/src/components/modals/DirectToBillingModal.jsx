import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useNotificationStore } from '../../store/notificationStore';
import { useDepartmentNotificationStore } from '../../store/departmentNotificationStore';
import { formatCurrency } from '../../utils/formatters';
import { Receipt, X, AlertCircle, CheckCircle2, User, FileText, Sparkles, Stethoscope } from 'lucide-react';

export const DirectToBillingModal = ({ isOpen, onClose, token, onSuccess }) => {
  useScrollLock(isOpen);

  const activePatient = (typeof token?.patientId === 'object' && token?.patientId !== null)
    ? token.patientId
    : {
        firstName: token?.patientName?.split(' ')[0] || 'Patient',
        lastName: token?.patientName?.split(' ').slice(1).join(' ') || '',
        uhid: token?.uhid || 'UHID',
        gender: 'GENERAL',
      };

  const [consultantFee, setConsultantFee] = useState('0');
  const [suggestions, setSuggestions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setConsultantFee('0');
      setSuggestions('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen, token]);

  if (!isOpen || !token) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError(null);

    const patId = token.patientId?._id || token.patientId;
    const feeAmount = Number(consultantFee) || 0;

    try {
      await axiosClient.post('/emr/consultations', {
        appointmentId: token._id,
        patientId: patId,
        chiefComplaints: token.chiefComplaints || 'General Consultation',
        prescriptions: [],
        pharmacyMode: 'EXTERNAL_NO_INHOUSE_PHARMACY',
        consultationFee: feeAmount,
        emergencyFee: 0,
        doctorProcedureCharges: [],
        adviceToPatient: suggestions.trim() || 'Consultation completed without in-house pharmacy. Dispatched directly to Central Billing.',
      });

      // Clear notifications and queues
      if (token._id) {
        useNotificationStore.getState().resolveEntityNotification(String(token._id));
        useDepartmentNotificationStore.getState().resolvePending(String(token._id));
      }
      if (patId) {
        useNotificationStore.getState().resolveEntityNotification(String(patId));
        useDepartmentNotificationStore.getState().resolvePending(String(patId));
      }
      useDepartmentNotificationStore.getState().fetchPendingWork?.();
      useNotificationStore.getState().fetchNotifications?.('active');

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to dispatch consultation directly to billing:', err);
      setError(err.response?.data?.message || err.response?.data?.error?.message || err.message || 'Failed to dispatch to Central Billing');
    } finally {
      setIsLoading(false);
    }
  };

  const presetFees = [0, 50, 100, 200, 300, 500];

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-container max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex-shrink-0">
              <Receipt size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate">Direct to Central Billing</h3>
              <p className="text-xs text-slate-500 mt-0.5">Complete visit &amp; send charges directly to Cashier (No In-House Pharmacy)</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="modal-close-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Patient Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                {activePatient.firstName?.[0] || 'P'}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {activePatient.firstName} {activePatient.lastName}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                  <span className="font-mono font-medium text-slate-600">{activePatient.uhid}</span>
                  <span>&bull;</span>
                  <span className="capitalize">{token.chiefComplaints || 'General OPD'}</span>
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 font-mono font-bold text-xs">
              Token #{token.tokenNumber}
            </span>
          </div>

          {/* 1. Consultant Fee Input */}
          <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Consultant Fee (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
              <input
                type="number"
                min="0"
                required
                value={consultantFee}
                onChange={(e) => setConsultantFee(e.target.value)}
                placeholder="Enter consultant fee"
                className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 font-mono"
              />
            </div>

            {/* Quick Fee Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] font-bold text-slate-500 mr-1">Quick Select:</span>
              {presetFees.map((fee) => (
                <button
                  key={fee}
                  type="button"
                  onClick={() => setConsultantFee(String(fee))}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all ${
                    Number(consultantFee) === fee
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  {fee === 0 ? '₹0 (Free)' : `₹${fee}`}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Doctor Suggestions / Advice Input Box */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Doctor Suggestions &amp; Clinical Advice</span>
              <span className="text-[10px] font-normal text-slate-400 normal-case">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              placeholder="Enter doctor clinical suggestions, diagnosis advice, dietary recommendations, or instructions for the patient & billing cashier..."
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 leading-relaxed"
            />
          </div>

          {/* Bill Summary Banner */}
          <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <Receipt size={16} className="text-indigo-600" />
              <span className="font-medium text-[11px]">Bill Dispatched to Cashier:</span>
            </div>
            <div className="text-right">
              <span className="font-mono font-black text-indigo-700 text-base">
                {formatCurrency(Number(consultantFee) || 0)}
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="modal-footer pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4"
            >
              <CheckCircle2 size={16} /> Dispatch to Central Billing
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
