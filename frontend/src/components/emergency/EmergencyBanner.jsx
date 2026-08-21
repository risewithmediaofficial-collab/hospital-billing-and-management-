import React, { useState } from 'react';
import { useEmergencyStore } from '../../store/emergencyStore';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { AlertTriangle, ShieldAlert, CheckCircle2, X, PlusCircle, MapPin, User, Clock, BellRing } from 'lucide-react';

export const EmergencyBanner = () => {
  const { emergencies, activeCount, resolveEmergency, addEmergency } = useEmergencyStore();
  const { user } = useAuthStore();
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    emergencyType: 'CODE_BLUE',
    severity: 'CRITICAL',
    location: '',
    patientName: '',
    uhid: '',
    description: '',
  });

  const activeEmergencies = emergencies.filter((e) => e.status === 'ACTIVE');

  React.useEffect(() => {
    const handleOpenModal = () => setIsRaiseModalOpen(true);
    window.addEventListener('open-emergency-modal', handleOpenModal);
    return () => window.removeEventListener('open-emergency-modal', handleOpenModal);
  }, []);

  const handleRaiseSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await axiosClient.post('/emergency/raise', {
        ...formData,
        raisedByDept: user?.role || 'GUARDIAN_PORTAL',
      });
      addEmergency(res.data);
      setIsRaiseModalOpen(false);
      setFormData({
        emergencyType: 'CODE_BLUE',
        severity: 'CRITICAL',
        location: '',
        patientName: '',
        uhid: '',
        description: '',
      });
    } catch (err) {
      console.error('Failed to raise emergency:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Active Emergency Banner */}
      {activeCount > 0 && (
        <div className="bg-red-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 animate-pulse border-b border-red-700">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1.5 rounded-lg bg-red-700 text-white flex-shrink-0">
              <ShieldAlert size={20} className="animate-bounce" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-xs uppercase tracking-wider bg-white text-red-700 px-2 py-0.5 rounded flex items-center gap-1">
                  <ShieldAlert size={13} className="text-red-600 shrink-0" />
                  ACTIVE EMERGENCY ({activeCount})
                </span>
                <span className="font-extrabold text-sm truncate">
                  {activeEmergencies[0]?.emergencyType} — {activeEmergencies[0]?.location}
                </span>
              </div>
              <p className="text-xs text-red-100 truncate mt-0.5">
                Patient: <span className="font-bold">{activeEmergencies[0]?.patientName}</span> ({activeEmergencies[0]?.uhid}) &bull; Raised by {activeEmergencies[0]?.raisedByUserName} ({activeEmergencies[0]?.raisedByDept})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsViewModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-white text-red-700 font-extrabold text-xs hover:bg-red-50 transition-all shadow-xs cursor-pointer"
            >
              View & Respond ({activeCount})
            </button>
          </div>
        </div>
      )}

      {/* Raise Emergency Modal */}
      {isRaiseModalOpen && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-container max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl border border-red-200">
            <div className="p-4 bg-red-600 text-white flex items-center justify-between border-b border-red-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-700 text-white flex-shrink-0 shadow-inner">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white tracking-tight leading-tight">Broadcast Emergency Alert</h3>
                  <p className="text-xs text-red-100 font-semibold mt-0.5">Instantly notify all doctors, nurses & emergency staff</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRaiseModalOpen(false)}
                className="p-2 rounded-xl bg-red-700 hover:bg-red-800 text-white transition-colors flex items-center justify-center font-bold text-xs gap-1 border border-red-500 cursor-pointer"
                title="Cancel & Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleRaiseSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">Emergency Protocol Type</label>
                  <select
                    value={formData.emergencyType}
                    onChange={(e) => setFormData({ ...formData, emergencyType: e.target.value })}
                    className="w-full glass-input rounded-lg px-3 py-2 text-xs font-bold text-red-700 bg-red-50 border-red-200"
                  >
                    <option value="CODE_BLUE">Code Blue (Cardiac / Respiratory Arrest)</option>
                    <option value="CODE_RED">Code Red (Fire / Disaster)</option>
                    <option value="TRAUMA_CRITICAL">Trauma / Severe Hemorrhage</option>
                    <option value="PATIENT_COLLAPSE">Patient Collapse in Ward / OPD</option>
                    <option value="ACUTE_RESPIRATORY_DISTRESS">Acute Respiratory Distress</option>
                    <option value="ANAPHYLAXIS">Anaphylactic Shock</option>
                    <option value="OTHER">Other Critical Emergency</option>
                  </select>
                </div>

                <Input
                  label="Location / Room / Ward (Mandatory)"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Room 302, Radiology Scanner 1, OPD Waiting Hall"
                  required
                />

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Patient Name (If known)"
                    value={formData.patientName}
                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                    placeholder="e.g. John Doe"
                  />
                  <Input
                    label="UHID (If known)"
                    value={formData.uhid}
                    onChange={(e) => setFormData({ ...formData, uhid: e.target.value })}
                    placeholder="e.g. HOSP-2026-0001"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">Emergency Brief Notes</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full glass-input rounded-lg p-2.5 text-xs text-slate-900"
                    placeholder="Provide quick critical context..."
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  <Button type="button" variant="outline" className="w-1/2" onClick={() => setIsRaiseModalOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" className="w-1/2 font-bold bg-red-600 hover:bg-red-700 text-white" isLoading={isSubmitting}>
                    Broadcast Emergency Alert
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Active Emergency History & Resolution Modal */}
      {isViewModalOpen && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-container max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-600 text-white">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Active Hospital Emergencies</h3>
                  <p className="text-xs text-slate-400">Emergency response & audit desk</p>
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body space-y-3 max-h-[70vh] overflow-y-auto">
              {activeEmergencies.length > 0 ? (
                activeEmergencies.map((emg) => (
                  <div key={emg._id || emg.emergencyId} className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-red-600 text-white font-black text-[10px] uppercase">
                          {emg.emergencyType}
                        </span>
                        <span className="font-bold text-red-900 text-xs flex items-center gap-1">
                          <MapPin size={12} /> {emg.location}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                        <Clock size={10} /> {new Date(emg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 space-y-1">
                      <p className="flex items-center gap-1 font-semibold text-slate-900">
                        <User size={12} className="text-slate-400" /> Patient: {emg.patientName} ({emg.uhid})
                      </p>
                      {emg.description && <p className="text-slate-600 italic bg-white p-2 rounded border border-red-100">{emg.description}</p>}
                      <p className="text-[11px] text-slate-500">
                        Raised by: <span className="font-bold text-slate-800">{emg.raisedByUserName}</span> ({emg.raisedByDept})
                      </p>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="primary"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                        onClick={() => resolveEmergency(emg._id || emg.emergencyId, 'Emergency condition stabilized by responding medical team.')}
                      >
                        <CheckCircle2 size={14} /> Mark as Stabilized & Resolved
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-500">
                  No active emergencies reported. All hospital wards normal.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
