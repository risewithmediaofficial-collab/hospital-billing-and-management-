import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, GitFork, ShieldAlert } from 'lucide-react';

export const CreateWardModal = ({ isOpen, onClose, wardToEdit = null, blocks = [], floors = [], onSuccess }) => {
  useScrollLock(isOpen);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [wardType, setWardType] = useState('GENERAL');
  const [blockId, setBlockId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [department, setDepartment] = useState('Inpatient');
  const [genderRestriction, setGenderRestriction] = useState('ANY');
  const [bedCapacity, setBedCapacity] = useState(10);
  const [defaultDailyCharge, setDefaultDailyCharge] = useState(150);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (wardToEdit) {
        setName(wardToEdit.name || '');
        setCode(wardToEdit.code || '');
        setWardType(wardToEdit.wardType || 'GENERAL');
        setBlockId(wardToEdit.blockId?._id || wardToEdit.blockId || '');
        setFloorId(wardToEdit.floorId?._id || wardToEdit.floorId || '');
        setDepartment(wardToEdit.department || 'Inpatient');
        setGenderRestriction(wardToEdit.genderRestriction || 'ANY');
        setBedCapacity(wardToEdit.bedCapacity || 10);
        setDefaultDailyCharge(wardToEdit.defaultDailyCharge !== undefined ? wardToEdit.defaultDailyCharge : 150);
        setDescription(wardToEdit.description || '');
        setStatus(wardToEdit.status || 'ACTIVE');
      } else {
        setName('');
        setCode('');
        setWardType('GENERAL');
        setBlockId('');
        setFloorId('');
        setDepartment('Inpatient');
        setGenderRestriction('ANY');
        setBedCapacity(10);
        setDefaultDailyCharge(150);
        setDescription('');
        setStatus('ACTIVE');
      }
      setError(null);
    }
  }, [isOpen, wardToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Ward Name is required.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (wardToEdit) {
        await axiosClient.put(`/beds/wards/${wardToEdit._id}`, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          wardType,
          blockId: blockId || null,
          floorId: floorId || null,
          department: department.trim(),
          genderRestriction,
          bedCapacity: Number(bedCapacity) || 1,
          defaultDailyCharge: Number(defaultDailyCharge) || 0,
          description: description.trim(),
          status,
        });
      } else {
        await axiosClient.post('/beds/wards', {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          wardType,
          blockId: blockId || null,
          floorId: floorId || null,
          department: department.trim(),
          genderRestriction,
          bedCapacity: Number(bedCapacity) || 1,
          defaultDailyCharge: Number(defaultDailyCharge) || 0,
          description: description.trim(),
          status,
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg = err.error?.message || err.response?.data?.message || err.message || 'Failed to save Ward.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFloors = blockId
    ? floors.filter((f) => String(f.blockId?._id || f.blockId) === String(blockId))
    : floors;

  const WARD_TYPE_OPTIONS = [
    { value: 'GENERAL', label: 'General Ward' },
    { value: 'MALE_WARD', label: 'Male Ward' },
    { value: 'FEMALE_WARD', label: 'Female Ward' },
    { value: 'ICU', label: 'Intensive Care Unit (ICU)' },
    { value: 'NICU', label: 'Neonatal ICU (NICU)' },
    { value: 'PICU', label: 'Pediatric ICU (PICU)' },
    { value: 'EMERGENCY', label: 'Emergency Observation Ward' },
    { value: 'MATERNITY', label: 'Maternity Ward' },
    { value: 'POST_OPERATIVE', label: 'Post-operative Ward' },
    { value: 'PEDIATRIC', label: 'Pediatric Ward' },
    { value: 'ISOLATION', label: 'Isolation Ward' },
    { value: 'PRIVATE', label: 'Private Ward' },
    { value: 'SEMI_PRIVATE', label: 'Semi-Private Ward' },
    { value: 'DELUXE', label: 'Deluxe Ward' },
    { value: 'CUSTOM', label: 'Custom Ward' },
  ];

  return (
    <div className="modal-overlay animate-fade-in z-50">
      <div className="modal-container max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 shrink-0">
              <GitFork size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 truncate">
                {wardToEdit ? 'Edit Ward / Section' : 'Add Ward / Section'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Clinical sections and specialized patient care units</p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5">
                <ShieldAlert size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Ward Name *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. ICU, General Ward 3B, Maternity Ward"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Ward Code
                </label>
                <Input
                  type="text"
                  placeholder="e.g. ICU-1, GW-3B"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full text-xs uppercase font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Ward Classification Type
                </label>
                <select
                  value={wardType}
                  onChange={(e) => setWardType(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200"
                >
                  {WARD_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Department
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Critical Care, Pediatrics, General"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Building / Block (Optional)
                </label>
                <select
                  value={blockId}
                  onChange={(e) => setBlockId(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200"
                >
                  <option value="">No Specific Block</option>
                  {blocks.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Floor (Optional)
                </label>
                <select
                  value={floorId}
                  onChange={(e) => setFloorId(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200"
                >
                  <option value="">No Specific Floor</option>
                  {filteredFloors.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.name} {f.blockId?.name ? `(${f.blockId.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Gender Restriction
                </label>
                <select
                  value={genderRestriction}
                  onChange={(e) => setGenderRestriction(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200"
                >
                  <option value="ANY">Any / Mixed</option>
                  <option value="MALE">Male Only</option>
                  <option value="FEMALE">Female Only</option>
                  <option value="CHILD">Child / Pediatric</option>
                  <option value="NOT_APPLICABLE">Not Applicable</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Bed Capacity
                </label>
                <Input
                  type="number"
                  min="1"
                  max="200"
                  value={bedCapacity}
                  onChange={(e) => setBedCapacity(e.target.value)}
                  className="w-full text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Default Tariff (₹/day)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={defaultDailyCharge}
                  onChange={(e) => setDefaultDailyCharge(e.target.value)}
                  className="w-full text-xs font-bold text-indigo-700"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isLoading} className="font-bold">
                {wardToEdit ? 'Save Changes' : 'Create Ward'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
