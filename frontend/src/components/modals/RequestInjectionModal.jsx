import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { Syringe, X, AlertCircle, Clock, Sparkles } from 'lucide-react';

const COMMON_INJECTIONS = [
  { name: 'Inj. Paracetamol (1g IV Stat)', dose: '1g IV Stat', route: 'IV', type: 'INJECTION' },
  { name: 'Inj. Diclofenac (75mg IM Stat)', dose: '75mg IM Stat', route: 'IM', type: 'INJECTION' },
  { name: 'Inj. Ondansetron (4mg IV Stat)', dose: '4mg IV Stat', route: 'IV', type: 'INJECTION' },
  { name: 'Inj. Pantoprazole (40mg IV Stat)', dose: '40mg IV Stat', route: 'IV', type: 'INJECTION' },
  { name: 'Inj. Tramadol (50mg IV/IM)', dose: '50mg IV Stat', route: 'IV', type: 'INJECTION' },
  { name: 'IV Normal Saline (0.9% 500ml Infusion)', dose: '500ml IV', route: 'IV', type: 'IV_FLUID' },
  { name: 'Inj. Tetanus Toxoid (TT 0.5ml IM)', dose: '0.5ml IM', route: 'IM', type: 'INJECTION' },
  { name: 'Nebulization (Duolin + Budecort)', dose: '1 Respule', route: 'Nebulization', type: 'NEBULIZATION' },
  { name: 'Sterile Wound Dressing & Bandage', dose: '1 Procedure', route: 'Dressing', type: 'DRESSING' },
];

export const RequestInjectionModal = ({ isOpen, onClose, patient, appointmentId, tokenNumber, doctorId, doctorName, onSuccess }) => {
  useScrollLock(isOpen);
  const [medicineName, setMedicineName] = useState('');
  const [dose, setDose] = useState('1 Ampoule IV Stat');
  const [route, setRoute] = useState('IV');
  const [taskType, setTaskType] = useState('INJECTION');
  const [priority, setPriority] = useState('STAT');
  const [doctorInstructions, setDoctorInstructions] = useState('');
  const [assignedNurseId, setAssignedNurseId] = useState('AUTO_ASSIGN');
  const [availableNurses, setAvailableNurses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setMedicineName('');
      setDose('1 Ampoule IV Stat');
      setRoute('IV');
      setTaskType('INJECTION');
      setPriority('STAT');
      setDoctorInstructions('Administer immediately in nursing/injection station.');
      setAssignedNurseId('AUTO_ASSIGN');
      setErrorMsg(null);
      fetchAvailableNurses();
    }
  }, [isOpen]);

  const fetchAvailableNurses = async () => {
    try {
      const res = await axiosClient.get('/pharmacy/available-nurses');
      const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setAvailableNurses(list);
    } catch (err) {
      console.warn('Failed to load available nurses:', err);
    }
  };

  if (!isOpen || !patient) return null;

  const handleSelectQuick = (inj) => {
    setMedicineName(inj.name);
    setDose(inj.dose);
    setRoute(inj.route);
    setTaskType(inj.type);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!medicineName.trim()) {
      setErrorMsg('Please enter or select an injection / treatment name.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await axiosClient.post('/pharmacy/nurse-tasks', {
        patientId: patient._id || patient.id,
        appointmentId,
        medicineName: medicineName.trim(),
        dose: dose.trim() || '1 Dose',
        route,
        taskType,
        priority,
        doctorInstructions: doctorInstructions.trim(),
        assignedNurseId: assignedNurseId === 'AUTO_ASSIGN' ? null : assignedNurseId,
      });

      if (onSuccess) onSuccess(res.data);
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || err.error?.message || err.message || 'Failed to dispatch injection task to nurse');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-container max-w-xl" onClick={(e) => e.stopPropagation()}>

        {/* Sticky Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex-shrink-0">
              <Syringe size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate">Order Nurse Injection &amp; Treatment</h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Patient: <span className="text-indigo-700 font-bold">{patient.firstName || patient.name} {patient.lastName || ''}</span> &bull; UHID: <span className="font-mono font-bold text-slate-700">{patient.uhid}</span> {tokenNumber && <span className="font-mono text-purple-700 font-bold">(Token #{tokenNumber})</span>}
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
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Quick Templates */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={13} className="text-purple-600" />
                Quick Clinical Presets (Click to Auto-Fill)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COMMON_INJECTIONS.map((inj) => (
                  <button
                    key={inj.name}
                    type="button"
                    onClick={() => handleSelectQuick(inj)}
                    className={`text-left p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                      medicineName === inj.name
                        ? 'bg-purple-50 border-purple-500 text-purple-950 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span className="truncate">{inj.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Medication Name & Dosage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Injection / Medicine Name *
                </label>
                <input
                  type="text"
                  value={medicineName}
                  onChange={(e) => setMedicineName(e.target.value)}
                  placeholder="e.g. Inj. Paracetamol IV"
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Dose / Quantity *
                </label>
                <input
                  type="text"
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                  placeholder="e.g. 1g IV Stat or 1 Ampoule"
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15"
                />
              </div>
            </div>

            {/* Route, Priority & Procedure Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Route of Administration *</label>
                <select
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15"
                >
                  <option value="IV">IV (Intravenous)</option>
                  <option value="IM">IM (Intramuscular)</option>
                  <option value="SC">SC (Subcutaneous)</option>
                  <option value="Nebulization">Nebulization</option>
                  <option value="Oral">Oral (Direct Stat)</option>
                  <option value="Dressing">Dressing / Topical</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Clinical Priority *</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15"
                >
                  <option value="STAT" className="text-red-700 font-bold">STAT (Immediate Admin)</option>
                  <option value="URGENT" className="text-amber-700 font-bold">URGENT (Within 15 mins)</option>
                  <option value="ROUTINE">ROUTINE (Standard OPD)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Assign Duty Nurse</label>
                <select
                  value={assignedNurseId}
                  onChange={(e) => setAssignedNurseId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15"
                >
                  <option value="AUTO_ASSIGN">Auto-Assign Available Nurse</option>
                  {availableNurses.map((nurse) => (
                    <option key={nurse._id || nurse.id} value={nurse._id || nurse.id}>
                      {nurse.name} ({nurse.activeTaskCount || 0} active)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Doctor Instructions */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Doctor Instructions / Clinical Observations
              </label>
              <textarea
                value={doctorInstructions}
                onChange={(e) => setDoctorInstructions(e.target.value)}
                placeholder="e.g. Administer IV slow infusion over 10 mins. Check BP and pulse post-injection."
                rows={2}
                className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
              />
            </div>

            {/* Workflow Notice */}
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-purple-900 text-xs flex items-start gap-2.5">
              <Clock size={16} className="text-purple-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Queue Hold &amp; Real-Time Nurse Alert</p>
                <p className="text-[11px] text-purple-800">
                  Submitting this task places Token #{tokenNumber} into <strong>"Waiting on Nurse / Injection"</strong> and notifies the Nurse Station immediately. The bill will not clear until the injection is recorded.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-1.5 shadow-sm"
                isLoading={isLoading}
              >
                <Syringe size={14} /> Send Patient to Nurse for Injection
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
