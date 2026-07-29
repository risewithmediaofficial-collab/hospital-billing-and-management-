import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';

export const RegisterPatientModal = ({ isOpen, onClose, onSuccess }) => {
  useScrollLock(isOpen);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', age: '', gender: 'MALE',
    dob: '1995-01-01', phone: '', email: '', address: '',
    chiefComplaints: '', bloodGroup: 'O+', category: 'GENERAL',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [createdPatient, setCreatedPatient] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosClient.post('/patients', formData);
      setCreatedPatient(response.data);
      if (onSuccess) onSuccess(response.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.error?.message || 'Failed to register patient');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCreatedPatient(null);
    setFormData({ firstName: '', lastName: '', age: '', gender: 'MALE', dob: '1995-01-01', phone: '', email: '', address: '', chiefComplaints: '', bloodGroup: 'O+', category: 'GENERAL' });
    onClose();
  };

  return (
    <div
      className="modal-overlay animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) handleReset(); }}
    >
      <div className="modal-container max-w-md" onClick={(e) => e.stopPropagation()}>

        {/* Sticky Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex-shrink-0">
              <UserPlus size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate">Register New Patient</h3>
              <p className="text-xs text-slate-500 mt-0.5">Generate UHID & Create Permanent Record</p>
            </div>
          </div>
          <button onClick={handleReset} className="modal-close-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="modal-body">
          {createdPatient ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle size={30} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Patient Registered!</h3>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Assigned UHID:</span>
                  <span className="font-mono font-black text-indigo-700 text-base tracking-wider">{createdPatient.uhid}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Name:</span>
                  <span className="font-bold text-slate-900">{createdPatient.firstName} {createdPatient.lastName}</span>
                </div>
                {createdPatient.age && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Age:</span>
                    <span className="text-slate-700">{createdPatient.age} Years</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="text-slate-700">{createdPatient.phone}</span>
                </div>
              </div>
              <Button variant="primary" className="w-full font-bold" onClick={handleReset}>
                Close & Return to Front Desk
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3.5">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Input label="First Name" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required placeholder="John" />
                <Input label="Last Name" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required placeholder="Doe" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input label="Age (Years)" type="number" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} placeholder="e.g. 32" required />
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full glass-input rounded-lg px-3 py-2 text-sm text-slate-900 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <Input label="Phone Number" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required placeholder="+1 (555) 000-0000" />
              <Input label="Chief Complaint / Reason for Visit" value={formData.chiefComplaints} onChange={(e) => setFormData({ ...formData, chiefComplaints: e.target.value })} placeholder="e.g. Fever, Chest tightness, Routine OPD checkup" />
              <Input label="Residential Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required placeholder="Street address, city" />

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="w-1/2" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="primary" className="w-1/2 font-bold" isLoading={isLoading}>Generate UHID</Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
