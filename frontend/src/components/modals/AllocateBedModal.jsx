import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useAuthStore } from '../../store/authStore';
import { X, BedDouble, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';

export const AllocateBedModal = ({ isOpen, onClose, admission, onSuccess }) => {
  useScrollLock(isOpen);
  const { user } = useAuthStore();
  const [wardName, setWardName] = useState('');
  const [bedNumber, setBedNumber] = useState('');
  const [dailyTariff, setDailyTariff] = useState(150);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [assignedDoctorId, setAssignedDoctorId] = useState('');
  const [assignedNurseId, setAssignedNurseId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [hospitalWards, setHospitalWards] = useState([]);
  const [selectedBedId, setSelectedBedId] = useState('');

  useEffect(() => {
    if (isOpen && admission) {
      setWardName(admission.targetWardName || 'General Ward');
      setBedNumber(admission.bedNumber !== 'UNASSIGNED' ? admission.bedNumber : '');
      setSelectedBedId(admission.bedId || '');
      setDailyTariff(admission.dailyTariff || 150);
      setError(null);
      fetchBedsAndWards();
      fetchNurses();
      setAssignedDoctorId(admission.doctorId?._id || admission.doctorId || '');
      setAssignedNurseId(admission.assignedNurseId?._id || admission.assignedNurseId || (['NURSE', 'NURSE_INCHARGE'].includes(user?.role) ? (user.id || user._id || '') : ''));
    }
  }, [isOpen, admission]);

  const fetchBedsAndWards = async () => {
    try {
      const [bedsRes, wardsRes] = await Promise.all([
        axiosClient.get('/beds?status=AVAILABLE').catch(() => []),
        axiosClient.get('/beds/wards').catch(() => []),
      ]);
      const allBeds = Array.isArray(bedsRes) ? bedsRes : (bedsRes.data || []);
      const allWards = Array.isArray(wardsRes) ? wardsRes : (wardsRes.data || []);
      setAvailableBeds(allBeds);
      setHospitalWards(allWards);
    } catch (err) {
      console.error('Failed to fetch available beds/wards:', err);
    }
  };

  const fetchNurses = async () => {
    try {
      const res = await axiosClient.get('/auth/staff');
      const staff = res.data?.data || res.data || [];
      setNurses(staff.filter((member) => ['NURSE', 'NURSE_INCHARGE'].includes(member.role) && member.isActive !== false));
      setDoctors(staff.filter((member) => member.role === 'DOCTOR' && member.isActive !== false));
    } catch (err) {
      console.error('Failed to fetch nurses:', err);
    }
  };

  if (!isOpen || !admission) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bedNumber.trim()) {
      setError('Please enter or select a valid Bed Number.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await axiosClient.patch(`/admissions/${admission._id}/allocate-bed`, {
        bedId: selectedBedId || undefined,
        wardName: wardName.trim(),
        bedNumber: bedNumber.trim().toUpperCase(),
        dailyTariff: Number(dailyTariff),
        assignedDoctorId,
        assignedNurseId: assignedNurseId || undefined,
        reassignOnly: admission.status === 'ADMITTED',
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const errMsg = err.error?.message || err.message || 'Failed to allocate bed to patient.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const activeWardList = hospitalWards.length > 0
    ? hospitalWards
    : [
        { name: 'General Ward 3B', wardType: 'GENERAL', defaultDailyCharge: 150 },
        { name: 'Intensive Care Unit (ICU)', wardType: 'ICU', defaultDailyCharge: 650 },
        { name: 'Emergency Ward', wardType: 'EMERGENCY', defaultDailyCharge: 200 },
        { name: 'Maternity Ward', wardType: 'MATERNITY', defaultDailyCharge: 350 },
      ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <BedDouble size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Allocate Ward &amp; Bed Assignment</h3>
              <p className="text-xs text-slate-500">
                Patient: <strong className="text-indigo-600">{admission.patientId?.firstName} {admission.patientId?.lastName}</strong> ({admission.patientId?.uhid})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="max-h-[72vh] overflow-y-auto pr-1">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Target Ward Select */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                1. Clinical Ward / Department *
              </label>
              <select
                value={wardName}
                onChange={(e) => {
                  const selectedWard = activeWardList.find((w) => w.name === e.target.value);
                  setWardName(e.target.value);
                  if (selectedWard?.defaultDailyCharge) {
                    setDailyTariff(selectedWard.defaultDailyCharge);
                  }
                }}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:border-indigo-500"
                required
                disabled={admission.status === 'ADMITTED'}
              >
                {activeWardList.map((w, idx) => (
                  <option key={w._id || idx} value={w.name}>
                    {w.name} {w.wardType ? `(${w.wardType})` : ''} {w.defaultDailyCharge ? `— ₹${w.defaultDailyCharge}/d` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Available Unassigned Beds Quick Pick */}
            {admission.status !== 'ADMITTED' && availableBeds.length > 0 && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Quick Pick Available Bed ({availableBeds.length} Ready):
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                  {availableBeds.map((b) => (
                    <button
                      key={b._id}
                      type="button"
                      onClick={() => {
                        setSelectedBedId(b._id);
                        setBedNumber(b.bedNumber);
                        if (b.wardName) setWardName(b.wardName);
                        if (b.dailyTariff) setDailyTariff(b.dailyTariff);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all text-left ${
                        bedNumber === b.bedNumber
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="font-extrabold">{b.bedNumber}</div>
                      <div className={`text-[9px] ${bedNumber === b.bedNumber ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {b.wardName || 'Ward'} • ₹{b.dailyTariff}/d
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bed Number Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                2. Enter / Confirm Bed Number *
              </label>
              <Input
                placeholder="e.g. BED-301, BED-302, ICU-101"
                value={bedNumber}
                onChange={(e) => setBedNumber(e.target.value.toUpperCase())}
                className="font-mono font-bold text-xs uppercase"
                required
                disabled={admission.status === 'ADMITTED'}
              />
              <p className="text-[10px] text-slate-500 mt-1">
                If the bed is currently OCCUPIED by another active patient, system will prevent duplicate assignment.
              </p>
            </div>

            {/* Daily Tariff */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                3. Daily Room Tariff (₹ / Day) *
              </label>
              <Input
                type="number"
                value={dailyTariff}
                onChange={(e) => setDailyTariff(e.target.value)}
                className="font-mono font-bold text-xs"
                required
                disabled={admission.status === 'ADMITTED'}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                4. Assign Attending Doctor *
              </label>
              <select
                value={assignedDoctorId}
                onChange={(e) => setAssignedDoctorId(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:border-indigo-500"
                required
              >
                <option value="">Select doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor._id || doctor.id} value={doctor._id || doctor.id}>
                    Dr. {doctor.name}{doctor.specialization ? ` — ${doctor.specialization}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                5. Assign Ward Nurse
              </label>
              <select
                value={assignedNurseId}
                onChange={(e) => setAssignedNurseId(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:border-indigo-500"
              >
                <option value="">No nurse assigned yet</option>
                {nurses.map((nurse) => (
                  <option key={nurse._id || nurse.id} value={nurse._id || nurse.id}>
                    {nurse.name} — {nurse.role === 'NURSE_INCHARGE' ? 'Nurse In-Charge' : 'Nurse'}{nurse.assignedUnit ? ` (${nurse.assignedUnit})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Defaults to the logged-in nurse. You can select another active nurse before allocation.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="success" size="sm" className="font-bold gap-1.5" isLoading={isLoading}>
                <CheckCircle size={15} /> {admission.status === 'ADMITTED' ? 'Save Care Team' : 'Confirm Allocation & Lock Bed'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
