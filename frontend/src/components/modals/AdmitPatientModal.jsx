import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, BedDouble, CheckCircle, AlertCircle } from 'lucide-react';

export const AdmitPatientModal = ({ isOpen, onClose, patient, onSuccess }) => {
  useScrollLock(isOpen);
  const [wardType, setWardType] = useState('GENERAL');
  const [targetWardName, setTargetWardName] = useState('Ward 3B - Inpatient');
  const [admissionReason, setAdmissionReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setWardType('GENERAL');
      setTargetWardName('Ward 3B - Inpatient');
      setAdmissionReason('');
      setIsRequested(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !patient) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await axiosClient.post('/admissions/request', {
        patientId: patient._id || patient.id,
        wardType,
        targetWardName,
        admissionReason: admissionReason.trim() || 'Inpatient observation and treatment',
      });
      setIsRequested(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to dispatch admission requisition:', err);
      const msg = err.error?.message || err.message || 'Failed to dispatch requisition to Nurse desk.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setIsRequested(false);
    onClose();
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-container max-w-lg" onClick={(e) => e.stopPropagation()}>

        {/* Sticky Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex-shrink-0">
              <BedDouble size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate">Recommend IPD Inpatient Admission</h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Patient: <span className="font-semibold text-slate-700">{patient.firstName} {patient.lastName} ({patient.uhid})</span>
              </p>
            </div>
          </div>
          <button onClick={handleReset} className="modal-close-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="modal-body">
          {isRequested ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle size={30} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">IPD Admission Requisition Sent!</h3>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-bold text-slate-900">{patient.firstName} {patient.lastName} ({patient.uhid})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Target Ward:</span>
                  <span className="font-bold text-amber-700">{targetWardName} ({wardType})</span>
                </div>
                <p className="text-[11px] text-emerald-700 pt-1 border-t border-slate-200">
                  ✓ Requisition dispatched to Nurse In-Charge & Ward Nurse for bed allocation!
                </p>
              </div>
              <Button variant="primary" className="w-full font-bold" onClick={handleReset}>
                Done & Return to Workstation
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 text-xs">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Select Ward Type</label>
                <select
                  value={wardType}
                  onChange={(e) => {
                    setWardType(e.target.value);
                    if (e.target.value === 'ICU') setTargetWardName('Intensive Care Unit (ICU)');
                    else if (e.target.value === 'PRIVATE') setTargetWardName('Deluxe Suite Floor 4');
                    else setTargetWardName('Ward 3B - Inpatient');
                  }}
                  className="w-full glass-input rounded-lg px-3.5 py-2 text-sm text-slate-900 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                >
                  <option value="GENERAL">General Ward 3B (₹150.00/day)</option>
                  <option value="SEMI_PRIVATE">Semi-Private Ward (₹250.00/day)</option>
                  <option value="PRIVATE">Deluxe Private Suite (₹500.00/day)</option>
                  <option value="ICU">Intensive Care Unit - ICU (₹650.00/day)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Clinical Reason for Admission</label>
                <textarea
                  className="w-full glass-input rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 resize-none"
                  rows={3}
                  placeholder="Enter clinical reason for inpatient admission..."
                  value={admissionReason}
                  onChange={(e) => setAdmissionReason(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="w-1/2" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="warning" className="w-1/2 font-bold" isLoading={isLoading}>
                  Dispatch to Nurse Desk
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
