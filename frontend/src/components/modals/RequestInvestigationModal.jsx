import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { TestTube, X, AlertCircle, Send, ShieldAlert } from 'lucide-react';

export const INVESTIGATION_OPTIONS = [
  { id: 'LABORATORY', name: 'Laboratory Tests', category: 'PATHOLOGY' },
  { id: 'XRAY', name: 'X-Ray Imaging', category: 'RADIOLOGY' },
  { id: 'MRI', name: 'MRI Scan (Magnetic Resonance)', category: 'RADIOLOGY' },
  { id: 'CT_SCAN', name: 'CT Scan (Computed Tomography)', category: 'RADIOLOGY' },
  { id: 'ULTRASOUND', name: 'Ultrasound Scan (USG)', category: 'RADIOLOGY' },
  { id: 'ECG', name: 'Electrocardiogram (ECG)', category: 'CARDIOLOGY' },
  { id: 'ECHO', name: 'Echocardiogram (ECHO)', category: 'CARDIOLOGY' },
  { id: 'EEG', name: 'Electroencephalogram (EEG)', category: 'NEUROLOGY' },
  { id: 'URINE_ANALYSIS', name: 'Urine Routine & Microscopic', category: 'PATHOLOGY' },
  { id: 'BLOOD_TEST', name: 'Complete Blood Count (CBC)', category: 'PATHOLOGY' },
  { id: 'CULTURE_TEST', name: 'Microbiology Culture & Sensitivity', category: 'PATHOLOGY' },
  { id: 'BIOPSY', name: 'Histopathology Biopsy', category: 'PATHOLOGY' },
  { id: 'ENDOSCOPY', name: 'Upper GI Endoscopy', category: 'GASTROENTEROLOGY' },
  { id: 'COLONOSCOPY', name: 'Lower GI Colonoscopy', category: 'GASTROENTEROLOGY' },
  { id: 'PFT', name: 'Pulmonary Function Test (PFT)', category: 'PULMONOLOGY' },
  { id: 'OTHER', name: 'Other Custom Investigation', category: 'OTHER' },
];

export const RequestInvestigationModal = ({ isOpen, onClose, patient, appointmentId, tokenNumber, doctorId, doctorName, onSuccess }) => {
  useScrollLock(isOpen);
  const [selectedType, setSelectedType] = useState('XRAY');
  const [customTestName, setCustomTestName] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedType('XRAY');
      setCustomTestName('');
      setPriority('NORMAL');
      setClinicalNotes('');
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen || !patient) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    const foundObj = INVESTIGATION_OPTIONS.find((inv) => inv.id === selectedType);
    const testName = selectedType === 'OTHER' ? customTestName || 'Custom Investigation' : foundObj?.name || selectedType;
    try {
      const res = await axiosClient.post('/diagnostics/request', {
        patientId: patient._id || patient.id,
        appointmentId,
        testCategory: foundObj?.category || 'PATHOLOGY',
        testName,
        priority,
        clinicalNotes,
        tokenNumber: tokenNumber || 1,
        doctorId,
        doctorName,
      });
      if (onSuccess) onSuccess(res.data);
      onClose();
      setCustomTestName('');
      setClinicalNotes('');
      setPriority('NORMAL');
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || err.error?.message || err.message || 'Failed to dispatch investigation request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-container max-w-lg" onClick={(e) => e.stopPropagation()}>

        {/* Sticky Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex-shrink-0">
              <TestTube size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate">Request Diagnostic Investigation</h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Patient: <span className="text-indigo-700 font-bold">{patient.firstName || patient.name} ({patient.uhid})</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="modal-body">
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle size={15} /> {errorMsg}
              </div>
            )}

            {/* Investigation Type */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Select Investigation / Test Modality</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full glass-input rounded-lg px-3.5 py-2 text-sm text-slate-900 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
              >
                {INVESTIGATION_OPTIONS.map((inv) => (
                  <option key={inv.id} value={inv.id}>{inv.name} ({inv.category})</option>
                ))}
              </select>
            </div>

            {selectedType === 'OTHER' && (
              <Input
                label="Custom Investigation Name"
                value={customTestName}
                onChange={(e) => setCustomTestName(e.target.value)}
                placeholder="e.g. Special Genetic Screening Test"
                required
              />
            )}

            {/* Priority */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Dispatch Clinical Priority Level</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('NORMAL')}
                  className={`p-2.5 rounded-lg font-bold border text-center transition-all text-xs ${
                    priority === 'NORMAL'
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  NORMAL
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('URGENT')}
                  className={`p-2.5 rounded-lg font-bold border text-center transition-all text-xs ${
                    priority === 'URGENT'
                      ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600'
                  }`}
                >
                  URGENT
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('EMERGENCY')}
                  className={`p-2.5 rounded-lg font-bold border text-center transition-all text-xs flex items-center justify-center gap-1 ${
                    priority === 'EMERGENCY'
                      ? 'bg-red-600 border-red-600 text-white shadow-sm animate-pulse'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600'
                  }`}
                >
                  <ShieldAlert size={13} /> EMRG
                </button>
              </div>
            </div>

            {/* Clinical Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Clinical History & Department Notes</label>
              <textarea
                className="w-full glass-input rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 resize-none"
                rows={3}
                placeholder="e.g. Patient presents with acute right lower quadrant pain. Rule out appendicitis."
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="w-1/2" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="primary" className="w-1/2 font-bold" isLoading={isLoading}>
                <Send size={14} /> Auto-Dispatch Request
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
