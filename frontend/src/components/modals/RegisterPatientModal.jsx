import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, UserPlus, CheckCircle } from 'lucide-react';

export const RegisterPatientModal = ({ isOpen, onClose, onSuccess }) => {
  useScrollLock(isOpen);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    gender: 'MALE',
    dob: '1995-01-01',
    phone: '',
    email: '',
    address: '',
    chiefComplaints: '',
    bloodGroup: 'O+',
    category: 'GENERAL',
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
    setFormData({
      firstName: '',
      lastName: '',
      age: '',
      gender: 'MALE',
      dob: '1995-01-01',
      phone: '',
      email: '',
      address: '',
      chiefComplaints: '',
      bloodGroup: 'O+',
      category: 'GENERAL',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="max-w-md w-full glass-panel rounded-2xl p-6 relative border border-sky-500/30">
        <button onClick={handleReset} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X size={20} />
        </button>

        {createdPatient ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle size={28} />
            </div>
            <h3 className="text-xl font-bold text-white">Patient Registered!</h3>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs space-y-1">
              <p><span className="text-slate-400">Assigned UHID:</span> <span className="font-mono font-bold text-sky-400 text-sm">{createdPatient.uhid}</span></p>
              <p><span className="text-slate-400">Name:</span> <span className="font-bold text-white">{createdPatient.firstName} {createdPatient.lastName}</span></p>
              {createdPatient.age && <p><span className="text-slate-400">Age:</span> <span className="text-slate-200">{createdPatient.age} Yrs</span></p>}
              <p><span className="text-slate-400">Phone:</span> <span className="text-slate-200">{createdPatient.phone}</span></p>
            </div>
            <Button variant="primary" className="w-full font-bold" onClick={handleReset}>
              Close & Return
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3.5">
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="text-sky-400" size={22} />
              <h3 className="text-lg font-bold text-white">Register New Patient</h3>
            </div>

            {error && <div className="p-2.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>}

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                placeholder="John"
              />
              <Input
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                placeholder="Doe"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <Input
                label="Age (Years)"
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="e.g. 32"
                required
              />
              <div>
                <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider text-[10px]">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full glass-input rounded-lg p-2 text-white bg-slate-900 border border-slate-700"
                >
                  <option value="MALE" className="bg-slate-900">Male</option>
                  <option value="FEMALE" className="bg-slate-900">Female</option>
                  <option value="OTHER" className="bg-slate-900">Other</option>
                </select>
              </div>
            </div>

            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              placeholder="+1 (555) 000-0000"
            />

            <Input
              label="Chief Complaint / Reason for Visit"
              value={formData.chiefComplaints}
              onChange={(e) => setFormData({ ...formData, chiefComplaints: e.target.value })}
              placeholder="e.g. Fever, Chest tightness, Routine OPD checkup"
            />

            <Input
              label="Residential Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
              placeholder="Street address, city"
            />

            <div className="pt-2 flex gap-2">
              <Button type="button" variant="outline" className="w-1/2" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="w-1/2 font-bold" isLoading={isLoading}>
                Generate UHID
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
