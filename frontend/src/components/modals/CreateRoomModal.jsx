import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, DoorOpen, ShieldAlert, CheckSquare, Square } from 'lucide-react';

export const CreateRoomModal = ({ isOpen, onClose, roomToEdit = null, blocks = [], floors = [], wards = [], onSuccess }) => {
  useScrollLock(isOpen);
  const [roomNumber, setRoomNumber] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState('SINGLE');
  const [blockId, setBlockId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [wardId, setWardId] = useState('');
  const [maxBedCapacity, setMaxBedCapacity] = useState(1);
  const [dailyRoomCharge, setDailyRoomCharge] = useState(500);
  const [autoGenerateBeds, setAutoGenerateBeds] = useState(true);
  const [dailyBedCharge, setDailyBedCharge] = useState(0);
  const [bedType, setBedType] = useState('NORMAL');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (roomToEdit) {
        setRoomNumber(roomToEdit.roomNumber || '');
        setRoomName(roomToEdit.roomName || '');
        setRoomType(roomToEdit.roomType || 'SINGLE');
        setBlockId(roomToEdit.blockId?._id || roomToEdit.blockId || '');
        setFloorId(roomToEdit.floorId?._id || roomToEdit.floorId || '');
        setWardId(roomToEdit.wardId?._id || roomToEdit.wardId || '');
        setMaxBedCapacity(roomToEdit.maxBedCapacity || 1);
        setDailyRoomCharge(roomToEdit.dailyRoomCharge !== undefined ? roomToEdit.dailyRoomCharge : 500);
        setAutoGenerateBeds(false);
        setDescription(roomToEdit.description || '');
        setStatus(roomToEdit.status || 'ACTIVE');
      } else {
        setRoomNumber('');
        setRoomName('');
        setRoomType('SINGLE');
        setBlockId('');
        setFloorId('');
        setWardId(wards.length > 0 ? (wards[0]._id || '') : '');
        setMaxBedCapacity(1);
        setDailyRoomCharge(500);
        setAutoGenerateBeds(true);
        setDailyBedCharge(0);
        setBedType('NORMAL');
        setDescription('');
        setStatus('ACTIVE');
      }
      setError(null);
    }
  }, [isOpen, roomToEdit, wards]);

  const handleRoomTypeChange = (type) => {
    setRoomType(type);
    if (!roomToEdit) {
      if (type === 'SINGLE') {
        setMaxBedCapacity(1);
        setDailyRoomCharge(1000);
      } else if (type === 'TWIN_SHARING') {
        setMaxBedCapacity(2);
        setDailyRoomCharge(500);
      } else if (type === 'TRIPLE_SHARING') {
        setMaxBedCapacity(3);
        setDailyRoomCharge(350);
      } else if (type === 'FOUR_SHARING') {
        setMaxBedCapacity(4);
        setDailyRoomCharge(250);
      } else if (type === 'MULTI_SHARING' || type === 'GENERAL_WARD_ROOM') {
        setMaxBedCapacity(6);
        setDailyRoomCharge(150);
      } else if (type === 'DELUXE' || type === 'SUITE') {
        setMaxBedCapacity(1);
        setDailyRoomCharge(2500);
      } else if (type === 'ICU' || type === 'NICU') {
        setMaxBedCapacity(2);
        setDailyRoomCharge(1500);
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roomNumber.trim()) {
      setError('Room Number is required.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (roomToEdit) {
        await axiosClient.put(`/beds/rooms/${roomToEdit._id}`, {
          roomNumber: roomNumber.trim(),
          roomName: roomName.trim() || `Room ${roomNumber.trim()}`,
          roomType,
          blockId: blockId || null,
          floorId: floorId || null,
          wardId: wardId || null,
          maxBedCapacity: Number(maxBedCapacity) || 1,
          dailyRoomCharge: Number(dailyRoomCharge) || 0,
          description: description.trim(),
          status,
        });
      } else {
        await axiosClient.post('/beds/rooms', {
          roomNumber: roomNumber.trim(),
          roomName: roomName.trim() || `Room ${roomNumber.trim()}`,
          roomType,
          blockId: blockId || null,
          floorId: floorId || null,
          wardId: wardId || null,
          maxBedCapacity: Number(maxBedCapacity) || 1,
          dailyRoomCharge: Number(dailyRoomCharge) || 0,
          autoGenerateBeds,
          dailyBedCharge: Number(dailyBedCharge) || 0,
          bedType,
          description: description.trim(),
          status,
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg = err.error?.message || err.response?.data?.message || err.message || 'Failed to save Room.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const ROOM_TYPE_OPTIONS = [
    { value: 'SINGLE', label: 'Single Occupancy Room' },
    { value: 'TWIN_SHARING', label: 'Twin Sharing (2 Beds)' },
    { value: 'TRIPLE_SHARING', label: 'Triple Sharing (3 Beds)' },
    { value: 'FOUR_SHARING', label: 'Four Sharing (4 Beds)' },
    { value: 'MULTI_SHARING', label: 'Multi Sharing Ward Room' },
    { value: 'GENERAL_WARD_ROOM', label: 'General Ward Room' },
    { value: 'SEMI_PRIVATE', label: 'Semi-Private Room' },
    { value: 'PRIVATE', label: 'Private Room' },
    { value: 'DELUXE', label: 'Deluxe Room' },
    { value: 'SUITE', label: 'VIP Suite' },
    { value: 'ICU', label: 'ICU Critical Bay' },
    { value: 'NICU', label: 'NICU Baby Bay' },
    { value: 'ISOLATION', label: 'Isolation Room' },
    { value: 'EMERGENCY_OBSERVATION', label: 'Emergency Observation Bay' },
    { value: 'CUSTOM', label: 'Custom Room' },
  ];

  return (
    <div className="modal-overlay animate-fade-in z-50">
      <div className="modal-container max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
              <DoorOpen size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 truncate">
                {roomToEdit ? 'Edit Room' : 'Add New Room'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Define room configuration, occupancy, and tariffs</p>
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
                  Room Number *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 101, 205, ICU-01"
                  value={roomNumber}
                  onChange={(e) => {
                    setRoomNumber(e.target.value);
                    if (!roomName) setRoomName(`Room ${e.target.value}`);
                  }}
                  required
                  className="w-full text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Room Display Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Deluxe Room 101"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Room Type / Occupancy
                </label>
                <select
                  value={roomType}
                  onChange={(e) => handleRoomTypeChange(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200"
                >
                  {ROOM_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
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
                  onChange={(e) => setWardId(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200"
                >
                  <option value="">No Specific Ward</option>
                  {wards.map((w) => (
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
                  {floors.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Bed Capacity (Beds in this Room)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={maxBedCapacity}
                  onChange={(e) => setMaxBedCapacity(e.target.value)}
                  className="w-full text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Daily Room Charge (₹/day)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={dailyRoomCharge}
                  onChange={(e) => setDailyRoomCharge(e.target.value)}
                  className="w-full text-xs font-bold text-indigo-700"
                />
              </div>
            </div>

            {/* Auto-generate Beds Option for new room */}
            {!roomToEdit && (
              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                <div
                  className="flex items-center gap-2 cursor-pointer select-none"
                  onClick={() => setAutoGenerateBeds(!autoGenerateBeds)}
                >
                  {autoGenerateBeds ? (
                    <CheckSquare size={16} className="text-indigo-600 shrink-0" />
                  ) : (
                    <Square size={16} className="text-slate-400 shrink-0" />
                  )}
                  <span className="font-bold text-indigo-950 text-xs">
                    Automatically Create {maxBedCapacity} Bed(s) ({roomNumber ? (maxBedCapacity > 1 ? `${roomNumber}-A to ${roomNumber}-${String.fromCharCode(64 + Number(maxBedCapacity))}` : roomNumber) : 'Auto-named'})
                  </span>
                </div>

                {autoGenerateBeds && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-900 mb-1 uppercase tracking-wider">
                        Bed Type
                      </label>
                      <select
                        value={bedType}
                        onChange={(e) => setBedType(e.target.value)}
                        className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 border border-indigo-200 bg-white"
                      >
                        <option value="NORMAL">Normal Standard</option>
                        <option value="ELECTRIC">Electric / Adjustable</option>
                        <option value="ICU">ICU Critical Bed</option>
                        <option value="VENTILATOR">Ventilator Bed</option>
                        <option value="PEDIATRIC">Pediatric Crib</option>
                        <option value="MATERNITY">Maternity Delivery Bed</option>
                        <option value="ISOLATION">Isolation Bed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-indigo-900 mb-1 uppercase tracking-wider">
                        Daily Bed Charge (₹/day)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={dailyBedCharge}
                        onChange={(e) => setDailyBedCharge(e.target.value)}
                        className="w-full text-xs font-bold bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isLoading} className="font-bold">
                {roomToEdit ? 'Save Changes' : 'Create Room'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
