import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, Siren, Zap, BedDouble, AlertOctagon, CheckCircle2, ShieldAlert } from 'lucide-react';

export const EmergencyBedFinderModal = ({ isOpen, onClose, onSelectBed }) => {
  useScrollLock(isOpen);
  const [beds, setBeds] = useState([]);
  const [selectedType, setSelectedType] = useState('EMERGENCY'); // 'EMERGENCY' | 'ICU' | 'GENERAL' | 'ISOLATION'
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableBeds();
    }
  }, [isOpen]);

  const fetchAvailableBeds = async () => {
    setIsLoading(true);
    try {
      const res = await axiosClient.get('/beds?status=AVAILABLE');
      const data = Array.isArray(res) ? res : (res.data || []);
      setBeds(data);
    } catch (err) {
      console.error('Failed to load beds for emergency finder:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const emergencyBeds = beds.filter((b) => b.wardType === 'EMERGENCY' || b.bedType === 'EMERGENCY' || (b.wardName && b.wardName.toUpperCase().includes('EMERGENCY')));
  const icuBeds = beds.filter((b) => b.wardType === 'ICU' || b.bedType === 'ICU' || (b.wardName && b.wardName.toUpperCase().includes('ICU')));
  const isolationBeds = beds.filter((b) => b.wardType === 'ISOLATION' || b.bedType === 'ISOLATION' || (b.wardName && b.wardName.toUpperCase().includes('ISOLATION')));
  const generalBeds = beds.filter((b) => !emergencyBeds.includes(b) && !icuBeds.includes(b) && !isolationBeds.includes(b));

  const getFilteredBeds = () => {
    if (selectedType === 'EMERGENCY') return emergencyBeds.length > 0 ? emergencyBeds : beds;
    if (selectedType === 'ICU') return icuBeds;
    if (selectedType === 'ISOLATION') return isolationBeds;
    return generalBeds;
  };

  const currentDisplayBeds = getFilteredBeds();

  return (
    <div className="modal-overlay animate-fade-in z-50">
      <div className="modal-container max-w-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header bg-rose-50 border-b border-rose-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0 shadow-sm animate-pulse">
              <Siren size={22} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-rose-950 truncate flex items-center gap-1.5">
                Rapid Emergency Bed Allocation Desk
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">One-touch immediate emergency &amp; critical care bed assignment</p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body space-y-4 text-xs">
          {/* Quick Categories Bar */}
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setSelectedType('EMERGENCY')}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                selectedType === 'EMERGENCY'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="font-extrabold text-xs">Emergency</div>
              <div className="text-[10px] mt-0.5 opacity-90">{emergencyBeds.length} Available</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('ICU')}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                selectedType === 'ICU'
                  ? 'bg-red-700 text-white border-red-700 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="font-extrabold text-xs">ICU Beds</div>
              <div className="text-[10px] mt-0.5 opacity-90">{icuBeds.length} Available</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('ISOLATION')}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                selectedType === 'ISOLATION'
                  ? 'bg-purple-700 text-white border-purple-700 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="font-extrabold text-xs">Isolation</div>
              <div className="text-[10px] mt-0.5 opacity-90">{isolationBeds.length} Available</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('GENERAL')}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                selectedType === 'GENERAL'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="font-extrabold text-xs">General / Ward</div>
              <div className="text-[10px] mt-0.5 opacity-90">{generalBeds.length} Available</div>
            </button>
          </div>

          {/* Bed List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <span>{selectedType} Beds Ready For Immediate Admission</span>
              <span>{currentDisplayBeds.length} Beds</span>
            </div>

            {currentDisplayBeds.length === 0 ? (
              <div className="p-6 text-center bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-semibold space-y-1">
                <AlertOctagon size={24} className="mx-auto text-rose-600 mb-1" />
                <p>No available {selectedType} beds found!</p>
                <p className="text-[11px] text-rose-600 font-normal">Check general beds or release/clean beds in progress.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto p-1">
                {currentDisplayBeds.map((b) => (
                  <div
                    key={b._id}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-slate-900 font-mono">{b.bedNumber}</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 animate-pulse" />
                      </div>
                      <div className="text-[11px] font-bold text-indigo-700 mt-1 truncate">{b.wardName || 'Ward'}</div>
                      <div className="text-[10px] text-slate-500 truncate">Room: {b.roomNumber || 'Open Ward'} • ₹{b.dailyTariff}/day</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectBed) onSelectBed(b);
                        onClose();
                      }}
                      className="mt-3 w-full py-1.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                    >
                      <Zap size={12} /> Assign Instantly
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
