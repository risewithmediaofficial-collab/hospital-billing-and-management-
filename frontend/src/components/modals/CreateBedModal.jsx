import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, BedDouble, ShieldAlert } from 'lucide-react';

export const CreateBedModal = ({ isOpen, onClose, bedToEdit = null, blocks = [], floors = [], wards = [], rooms = [], onSuccess }) => {
  useScrollLock(isOpen);
  const [bedNumber, setBedNumber] = useState('');
  const [bedName, setBedName] = useState('');
  const [bedType, setBedType] = useState('NORMAL');
  const [blockId, setBlockId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [wardId, setWardId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [dailyTariff, setDailyTariff] = useState('');
  const [status, setStatus] = useState('AVAILABLE');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (bedToEdit) {
        setBedNumber(bedToEdit.bedNumber || '');
        setBedName(bedToEdit.bedName || '');
        setBedType(bedToEdit.bedType || 'NORMAL');
        setBlockId(bedToEdit.blockId?._id || bedToEdit.blockId || '');
        setFloorId(bedToEdit.floorId?._id || bedToEdit.floorId || '');
        setWardId(bedToEdit.wardId?._id || bedToEdit.wardId || '');
        setRoomId(bedToEdit.roomId?._id || bedToEdit.roomId || '');
        setDailyTariff(bedToEdit.dailyTariff !== undefined ? bedToEdit.dailyTariff : '');
        setStatus(bedToEdit.status || 'AVAILABLE');
        setNotes(bedToEdit.notes || '');
      } else {
        setBedNumber('');
        setBedName('');
        setBedType('NORMAL');
        setBlockId('');
        setFloorId('');
        // Auto-select first ward and pre-fill tariff
        const firstWard = wards.length > 0 ? wards[0] : null;
        setWardId(firstWard?._id || '');
        setDailyTariff(firstWard?.defaultDailyCharge || '');
        setRoomId('');
        setStatus('AVAILABLE');
        setNotes('');
      }
      setError(null);
    }
  }, [isOpen, bedToEdit, wards]);

  const handleRoomSelect = (selRoomId) => {
    setRoomId(selRoomId);
    if (selRoomId) {
      const matched = rooms.find((r) => String(r._id) === String(selRoomId));
      if (matched) {
        const selWardId = matched.wardId?._id || matched.wardId;
        if (selWardId) {
          setWardId(selWardId);
          // Auto-fill tariff from the ward this room belongs to
          const matchedWard = wards.find((w) => String(w._id) === String(selWardId));
          if (matchedWard) setDailyTariff(matchedWard.defaultDailyCharge || '');
        }
        if (matched.floorId?._id || matched.floorId) setFloorId(matched.floorId?._id || matched.floorId);
        if (matched.blockId?._id || matched.blockId) setBlockId(matched.blockId?._id || matched.blockId);
      }
    }
  };

  const handleWardSelect = (selWardId) => {
    setWardId(selWardId);
    if (selWardId) {
      const matched = wards.find((w) => String(w._id) === String(selWardId));
      if (matched) {
        if (matched.floorId?._id || matched.floorId) setFloorId(matched.floorId?._id || matched.floorId);
        if (matched.blockId?._id || matched.blockId) setBlockId(matched.blockId?._id || matched.blockId);
        // Auto-fill tariff from ward
        setDailyTariff(matched.defaultDailyCharge || '');
      }
    }
  };

  const handleFloorSelect = (selFloorId) => {
    setFloorId(selFloorId);
    if (selFloorId) {
      const matched = floors.find((f) => String(f._id) === String(selFloorId));
      if (matched && (matched.blockId?._id || matched.blockId)) {
        setBlockId(matched.blockId?._id || matched.blockId);
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bedNumber.trim()) {
      setError('Bed Number is required.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        bedNumber: bedNumber.trim().toUpperCase(),
        bedName: bedName.trim() || `Bed ${bedNumber.trim().toUpperCase()}`,
        bedType,
        blockId: blockId || null,
        floorId: floorId || null,
        wardId: wardId || null,
        roomId: roomId || null,
        dailyBedCharge: 0,
        dailyRoomCharge: 0,
        dailyWardCharge: 0,
        dailyTariff: Number(dailyTariff) || 150,
        status,
        notes: notes.trim(),
      };

      if (bedToEdit) {
        await axiosClient.put(`/beds/${bedToEdit._id}`, payload);
      } else {
        await axiosClient.post('/beds', payload);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg = err.error?.message || err.response?.data?.message || err.message || 'Failed to save Bed record.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const BED_TYPE_OPTIONS = [
    { value: 'NORMAL', label: 'Normal Standard Bed' },
    { value: 'ELECTRIC', label: 'Electric / Motorized Adjustable Bed' },
    { value: 'ICU', label: 'ICU Critical Bed' },
    { value: 'VENTILATOR', label: 'Ventilator-Supported Bed' },
    { value: 'PEDIATRIC', label: 'Pediatric Crib' },
    { value: 'MATERNITY', label: 'Maternity Delivery Bed' },
    { value: 'ISOLATION', label: 'Negative Pressure Isolation Bed' },
    { value: 'EMERGENCY', label: 'Emergency Trauma Gurney' },
    { value: 'CUSTOM', label: 'Custom Specification' },
  ];

  const filteredFloors = blockId
    ? floors.filter((f) => String(f.blockId?._id || f.blockId) === String(blockId))
    : floors;

  const filteredWards = floorId
    ? wards.filter((w) => String(w.floorId?._id || w.floorId) === String(floorId))
    : wards;

  const filteredRooms = wardId
    ? rooms.filter((r) => String(r.wardId?._id || r.wardId) === String(wardId))
    : rooms;

  return (
    <div className="modal-overlay animate-fade-in z-50" data-testid="bed-modal">
      <div className="modal-container max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <BedDouble size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 truncate">
                {bedToEdit ? `Edit Bed ${bedToEdit.bedNumber}` : 'Add Individual Bed'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Physical inpatient bed and tariff configuration</p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close" data-testid="bed-close-icon">
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
                  Bed Number / Identifier *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 101-A, ICU-03, BED-305"
                  value={bedNumber}
                  onChange={(e) => setBedNumber(e.target.value.toUpperCase())}
                  required
                  data-testid="bed-number-input"
                  className="w-full text-xs font-bold uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Bed Display Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Bed 101-A"
                  value={bedName}
                  onChange={(e) => setBedName(e.target.value)}
                  data-testid="bed-name-input"
                  className="w-full text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Bed Type
                </label>
                <select
                  value={bedType}
                  onChange={(e) => setBedType(e.target.value)}
                  data-testid="bed-type-select"
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200"
                >
                  {BED_TYPE_OPTIONS.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Initial Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  data-testid="bed-status-select"
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200"
                >
                  <option value="AVAILABLE">Available (Ready for Admission)</option>
                  <option value="CLEANING">Cleaning / Sanitizing (Queued)</option>
                  <option value="MAINTENANCE">Maintenance (Fault Reported)</option>
                  <option value="BLOCKED">Blocked (Temporarily Inactive)</option>
                  <option value="ISOLATION">Isolation (Quarantine Only)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Room
                </label>
                <select
                  value={roomId}
                  onChange={(e) => handleRoomSelect(e.target.value)}
                  data-testid="bed-room-select"
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200"
                >
                  <option value="">No Specific Room</option>
                  {filteredRooms.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.roomNumber} ({r.roomName || r.roomType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Ward / Section
                </label>
                <select
                  value={wardId}
                  onChange={(e) => handleWardSelect(e.target.value)}
                  data-testid="bed-ward-select"
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200"
                >
                  <option value="">No Specific Ward</option>
                  {filteredWards.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name}
                    </option>
                  ))}
                </select>
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
                  data-testid="bed-block-select"
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
                  onChange={(e) => handleFloorSelect(e.target.value)}
                  data-testid="bed-floor-select"
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200"
                >
                  <option value="">No Specific Floor</option>
                  {filteredFloors.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 space-y-2">
              <label className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
                <span>Daily Bed Tariff (₹/day)</span>
                <span className="text-[10px] text-emerald-600 font-semibold lowercase">auto-filled from ward</span>
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  value={dailyTariff}
                  onChange={(e) => setDailyTariff(e.target.value)}
                  data-testid="bed-charge-input"
                  className="text-sm font-extrabold text-emerald-700 border-emerald-300"
                  required
                />
                <span className="text-xs text-slate-500 font-semibold shrink-0">₹ per 24 hours</span>
              </div>
              <p className="text-[10px] text-emerald-700 font-semibold">
                ⭐ Auto-inherited from the selected ward's tariff. You may adjust for this specific bed if needed.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Bed Notes / Amenities
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="bed-notes-input"
                rows={2}
                placeholder="Oxygen port connected, near window, pediatric rails..."
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-900 border border-slate-200 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} data-testid="bed-cancel-button">
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isLoading} data-testid="bed-save-button" className="font-bold">
                {bedToEdit ? 'Save Changes' : 'Create Bed'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
