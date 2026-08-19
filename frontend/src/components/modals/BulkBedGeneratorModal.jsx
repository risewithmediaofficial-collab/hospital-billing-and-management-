import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, Sparkles, Layers, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const BulkBedGeneratorModal = ({ isOpen, onClose, blocks = [], floors = [], wards = [], onSuccess }) => {
  useScrollLock(isOpen);
  const [blockId, setBlockId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [wardId, setWardId] = useState('');
  const [startRoomNumber, setStartRoomNumber] = useState('101');
  const [endRoomNumber, setEndRoomNumber] = useState('110');
  const [roomType, setRoomType] = useState('TWIN_SHARING');
  const [bedsPerRoom, setBedsPerRoom] = useState(2);
  const [bedType, setBedType] = useState('NORMAL');
  const [dailyRoomCharge, setDailyRoomCharge] = useState(300);
  const [dailyBedCharge, setDailyBedCharge] = useState(0);
  const [namingPattern, setNamingPattern] = useState('ALPHA'); // ALPHA | NUMERIC
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewItems, setPreviewItems] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  if (!isOpen) return null;

  const generatePreview = () => {
    const start = parseInt(startRoomNumber, 10);
    const end = parseInt(endRoomNumber, 10);

    if (isNaN(start) || isNaN(end) || start > end) {
      setError('Please provide a valid start and end room range (e.g. 101 to 110).');
      return;
    }
    if (end - start > 50) {
      setError('Maximum 50 rooms can be generated in one batch.');
      return;
    }

    setError(null);
    const alphaSuffixes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const items = [];

    for (let r = start; r <= end; r++) {
      const roomNum = String(r);
      const bedList = [];
      for (let b = 0; b < bedsPerRoom; b++) {
        const suffix = bedsPerRoom === 1 ? '' : (namingPattern === 'NUMERIC' ? `-${String(b + 1).padStart(2, '0')}` : `-${alphaSuffixes[b] || (b + 1)}`);
        bedList.push(`${roomNum}${suffix}`);
      }
      items.push({ roomNumber: roomNum, beds: bedList });
    }

    setPreviewItems(items);
    setShowPreview(true);
  };

  const handleExecute = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await axiosClient.post('/beds/bulk-generate', {
        blockId: blockId || null,
        floorId: floorId || null,
        wardId: wardId || null,
        startRoomNumber,
        endRoomNumber,
        roomType,
        bedsPerRoom: Number(bedsPerRoom) || 1,
        bedType,
        dailyRoomCharge: Number(dailyRoomCharge) || 0,
        dailyBedCharge: Number(dailyBedCharge) || 0,
        namingPattern,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg = err.error?.message || err.response?.data?.message || err.message || 'Failed to bulk generate beds.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const totalBedsCount = (parseInt(endRoomNumber, 10) - parseInt(startRoomNumber, 10) + 1) * (parseInt(bedsPerRoom, 10) || 1);

  return (
    <div className="modal-overlay animate-fade-in z-50">
      <div className="modal-container max-w-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-violet-50 text-violet-600 border border-violet-200 shrink-0">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 truncate">
                Bulk Room &amp; Bed Generator Wizard
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Rapidly initialize blocks of rooms and auto-numbered beds</p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5">
              <ShieldAlert size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {!showPreview ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Building / Block
                  </label>
                  <select
                    value={blockId}
                    onChange={(e) => setBlockId(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200"
                  >
                    <option value="">No Block</option>
                    {blocks.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Floor
                  </label>
                  <select
                    value={floorId}
                    onChange={(e) => setFloorId(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-200"
                  >
                    <option value="">No Floor</option>
                    {floors.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.name}
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
                    <option value="">No Ward</option>
                    {wards.map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Room Range */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Room Range &amp; Bed Capacity
                </span>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Start Room #</label>
                    <Input
                      type="number"
                      value={startRoomNumber}
                      onChange={(e) => setStartRoomNumber(e.target.value)}
                      required
                      className="text-xs font-bold font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">End Room #</label>
                    <Input
                      type="number"
                      value={endRoomNumber}
                      onChange={(e) => setEndRoomNumber(e.target.value)}
                      required
                      className="text-xs font-bold font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Beds Per Room</label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={bedsPerRoom}
                      onChange={(e) => setBedsPerRoom(e.target.value)}
                      className="text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Room & Bed Types */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Room Type
                  </label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="w-full glass-input rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-900 border border-slate-200"
                  >
                    <option value="SINGLE">Single Room</option>
                    <option value="TWIN_SHARING">Twin Sharing</option>
                    <option value="TRIPLE_SHARING">Triple Sharing</option>
                    <option value="FOUR_SHARING">Four Sharing</option>
                    <option value="MULTI_SHARING">Multi Sharing</option>
                    <option value="GENERAL_WARD_ROOM">General Ward Room</option>
                    <option value="ICU">ICU Bay</option>
                    <option value="DELUXE">Deluxe Room</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Bed Type
                  </label>
                  <select
                    value={bedType}
                    onChange={(e) => setBedType(e.target.value)}
                    className="w-full glass-input rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-900 border border-slate-200"
                  >
                    <option value="NORMAL">Normal Standard</option>
                    <option value="ELECTRIC">Electric Adjustable</option>
                    <option value="ICU">ICU Critical</option>
                    <option value="VENTILATOR">Ventilator</option>
                    <option value="PEDIATRIC">Pediatric</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Bed Suffix Pattern
                  </label>
                  <select
                    value={namingPattern}
                    onChange={(e) => setNamingPattern(e.target.value)}
                    className="w-full glass-input rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-900 border border-slate-200"
                  >
                    <option value="ALPHA">Alpha (101-A, 101-B)</option>
                    <option value="NUMERIC">Numeric (101-01, 101-02)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Daily Room Charge (₹/day)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={dailyRoomCharge}
                    onChange={(e) => setDailyRoomCharge(e.target.value)}
                    className="text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Daily Bed Charge (₹/day)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={dailyBedCharge}
                    onChange={(e) => setDailyBedCharge(e.target.value)}
                    className="text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-violet-700">
                  Total To Create: ~{isNaN(totalBedsCount) ? 0 : totalBedsCount} Bed(s)
                </span>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="button" variant="primary" onClick={generatePreview} className="font-bold">
                    Preview Generation ➔
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-between text-violet-900 font-bold">
                <span>
                  Ready to generate {previewItems.length} Room(s) &amp; {previewItems.reduce((s, r) => s + r.beds.length, 0)} Bed(s)
                </span>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="text-xs text-violet-700 underline font-semibold hover:text-violet-900"
                >
                  Edit Parameters
                </button>
              </div>

              {/* Preview Table / Cards */}
              <div className="max-h-60 overflow-y-auto space-y-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                {previewItems.map((item) => (
                  <div key={item.roomNumber} className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                    <div className="font-bold text-slate-800">
                      Room {item.roomNumber} <span className="text-[10px] text-slate-500 font-normal">({roomType})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {item.beds.map((b) => (
                        <span key={b} className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold border border-emerald-200">
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setShowPreview(false)} disabled={isLoading}>
                  Back
                </Button>
                <Button type="button" variant="primary" onClick={handleExecute} isLoading={isLoading} className="font-bold">
                  Confirm &amp; Create All
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
