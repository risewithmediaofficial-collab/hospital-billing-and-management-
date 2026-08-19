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
  const [caretakers, setCaretakers] = useState([]);
  const [assignedDoctorId, setAssignedDoctorId] = useState('');
  const [assignedNurseId, setAssignedNurseId] = useState('');
  const [assignedCaretakerId, setAssignedCaretakerId] = useState('');
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
      setAssignedCaretakerId(admission.assignedCaretakerId?._id || admission.assignedCaretakerId || '');
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
      setCaretakers(staff.filter((member) => ['SUPPORT_STAFF', 'IPD_STAFF', 'NURSE', 'NURSE_INCHARGE'].includes(member.role) && member.isActive !== false));
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
        assignedCaretakerId: assignedCaretakerId || undefined,
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
        { name: 'Male Ward 2A', wardType: 'GENERAL', defaultDailyCharge: 150 },
        { name: 'Female Ward 2B', wardType: 'GENERAL', defaultDailyCharge: 150 },
        { name: 'Semi-Private Floor 3', wardType: 'SEMI_PRIVATE', defaultDailyCharge: 250 },
        { name: 'Deluxe Suite Floor 4', wardType: 'PRIVATE', defaultDailyCharge: 500 },
      ];

  return (
    <div className="modal-overlay animate-fade-in z-50">
      <div className="modal-container max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 flex-shrink-0">
              <BedDouble size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 truncate">Allocate Ward & Bed Assignment</h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Patient: <span className="font-bold text-indigo-700">{admission.patientName} ({admission.uhid})</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5 shadow-2xs">
                <ShieldAlert size={18} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs font-semibold leading-snug">{error}</div>
              </div>
            )}

            {/* Patient Requisition Context */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-500">Requisition Doctor:</span>
                <span className="font-bold text-slate-900">{admission.doctorName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-500">Requested Ward Type:</span>
                <span className="font-bold text-amber-700">{admission.wardType}</span>
              </div>
              <p className="text-[11px] text-slate-600 italic pt-1 border-t border-slate-200">
                "{admission.admissionReason || 'Inpatient care requisition'}"
              </p>
            </div>

            {/* Ward Selection */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                1. Select Ward / Department Name *
              </label>
              <select
                value={wardName}
                onChange={(e) => {
                  setWardName(e.target.value);
                  const matched = activeWardList.find((w) => w.name === e.target.value);
                  if (matched) setDailyTariff(matched.defaultDailyCharge || matched.tariff || 150);
                }}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:border-indigo-500"
                required
                disabled={admission.status === 'ADMITTED'}
              >
                {activeWardList.map((w, idx) => (
                  <option key={idx} value={w.name}>
                    {w.name} (₹{w.defaultDailyCharge || w.tariff || 150}/day)
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

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                6. Assign Caretaker / Ward Support
              </label>
              <select
                value={assignedCaretakerId}
                onChange={(e) => setAssignedCaretakerId(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:border-indigo-500"
              >
                <option value="">No caretaker assigned yet</option>
                {caretakers.map((member) => (
                  <option key={member._id || member.id} value={member._id || member.id}>
                    {member.name} — {member.role.replaceAll('_', ' ')}{member.assignedUnit ? ` (${member.assignedUnit})` : ''}
                  </option>
                ))}
              </select>
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
