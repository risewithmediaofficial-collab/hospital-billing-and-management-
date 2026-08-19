import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { axiosClient } from '../../api/axiosClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { X, History, Clock, User, ShieldCheck, Wrench, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

export const BedHistoryModal = ({ isOpen, onClose, bed = null }) => {
  useScrollLock(isOpen);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && bed) {
      fetchHistory();
    }
  }, [isOpen, bed]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await axiosClient.get(`/beds/${bed._id}/history`);
      const data = Array.isArray(res) ? res : (res.data || []);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load bed history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !bed) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">AVAILABLE</span>;
      case 'OCCUPIED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">OCCUPIED</span>;
      case 'CLEANING':
      case 'CLEANING_SANITIZING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">CLEANING</span>;
      case 'MAINTENANCE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-300">MAINTENANCE</span>;
      case 'RESERVED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">RESERVED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="modal-overlay animate-fade-in z-50">
      <div className="modal-container max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 shrink-0">
              <History size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 truncate">
                Bed Audit History &amp; Lifecycle
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Bed {bed.bedNumber} • {bed.wardName || 'General Ward'}</p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body space-y-3 text-xs">
          {/* Current State Summary */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Current Real-Time Status</div>
              <div className="mt-1">{getStatusBadge(bed.status)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Daily Tariff</div>
              <div className="font-extrabold text-slate-900 mt-0.5">₹{bed.dailyTariff}/day</div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              Historical Timeline ({history.length} Events)
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-slate-400">Loading audit history...</div>
            ) : history.length === 0 ? (
              <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                No previous status transition records found for this bed.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto p-1">
                {history.map((h) => (
                  <div key={h._id} className="p-2.5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 font-bold">
                        {h.fromStatus && (
                          <>
                            {getStatusBadge(h.fromStatus)}
                            <ArrowRight size={12} className="text-slate-400" />
                          </>
                        )}
                        {getStatusBadge(h.toStatus)}
                      </div>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(h.timestamp || h.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {h.reason && (
                      <p className="text-[11px] text-slate-700 font-medium">{h.reason}</p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>Operator: <strong>{h.changedByName || 'System'}</strong></span>
                      {h.patientId && (
                        <span>Patient: <strong>{h.patientId.firstName} {h.patientId.lastName}</strong> ({h.patientId.uhid})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
