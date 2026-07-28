import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { TestTube, X, AlertCircle, Send, ShieldAlert, Sparkles } from 'lucide-react';

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

export const RequestInvestigationModal = ({ isOpen, onClose, patient, tokenNumber, onSuccess }) => {
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
        testCategory: selectedType,
        testName,
        priority,
        clinicalNotes,
        tokenNumber: tokenNumber || 1,
      });

      if (onSuccess) {
        onSuccess(res.data);
      }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="max-w-lg w-full glass-panel rounded-2xl p-6 relative border border-sky-500/30">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X size={20} />
        </button>

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 text-xs">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <TestTube size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Request Diagnostic Investigation</h3>
              <p className="text-[11px] text-slate-400">
                Target Patient: <span className="text-sky-400 font-bold">{patient.firstName || patient.name} ({patient.uhid})</span>
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          {/* Investigation Type Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider text-[10px]">
              Select Investigation / Test Modality
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full glass-input rounded-lg p-2.5 text-white font-bold text-xs bg-slate-900 border border-slate-800"
            >
              {INVESTIGATION_OPTIONS.map((inv) => (
                <option key={inv.id} value={inv.id} className="bg-slate-900 text-white">
                  {inv.name} ({inv.category})
                </option>
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

          {/* Priority Selection */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider text-[10px]">
              Dispatch Clinical Priority Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPriority('NORMAL')}
                className={`p-2 rounded-lg font-bold border text-center transition-all ${
                  priority === 'NORMAL'
                    ? 'bg-sky-500/20 border-sky-500 text-sky-400 shadow'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                NORMAL
              </button>
              <button
                type="button"
                onClick={() => setPriority('URGENT')}
                className={`p-2 rounded-lg font-bold border text-center transition-all ${
                  priority === 'URGENT'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                URGENT
              </button>
              <button
                type="button"
                onClick={() => setPriority('EMERGENCY')}
                className={`p-2 rounded-lg font-bold border text-center transition-all flex items-center justify-center gap-1 ${
                  priority === 'EMERGENCY'
                    ? 'bg-red-500/20 border-red-500 text-red-400 shadow animate-pulse'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <ShieldAlert size={14} /> EMERGENCY
              </button>
            </div>
          </div>

          {/* Clinical Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider text-[10px]">
              Clinical History & Specific Department Notes
            </label>
            <textarea
              className="w-full glass-input rounded-lg p-2.5 text-xs text-white"
              rows={3}
              placeholder="e.g. Patient presents with acute right lower quadrant pain. Rule out appendicitis."
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              autoComplete="off"
            ></textarea>
          </div>

          <div className="pt-2 flex gap-2">
            <Button type="button" variant="outline" className="w-1/2" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="w-1/2 font-bold" isLoading={isLoading}>
              <Send size={14} /> Auto-Dispatch Request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
