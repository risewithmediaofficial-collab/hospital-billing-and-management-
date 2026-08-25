import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, Globe } from 'lucide-react';
import { useSuperAdminContextStore } from '../../store/superAdminContextStore';
import { axiosClient } from '../../api/axiosClient';

export const HospitalSelector = ({ compact = false }) => {
  const navigate = useNavigate();
  const {
    selectedHospitalId,
    selectedHospitalName,
    setSelectedHospital,
    clearSelectedHospital,
    hospitals,
    setHospitals,
  } = useSuperAdminContextStore();
  const [isOpen, setIsOpen] = useState(false);

  const fetchHospitals = async () => {
    try {
      const res = await axiosClient.get('/saas/hospitals');
      const rawList = res.data?.data || res.data || [];
      const activeList = Array.isArray(rawList)
        ? rawList.filter((h) => !h.isDeleted && h.status !== 'DELETED')
        : [];
      setHospitals(activeList);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  // Filter out any deleted hospitals from store list before rendering
  const activeHospitals = (hospitals || []).filter(
    (h) => !h.isDeleted && h.status !== 'DELETED'
  );

  // If currently selected hospital was deleted, clear selection
  useEffect(() => {
    if (selectedHospitalId && hospitals.length > 0) {
      const isCurrentActive = hospitals.some(
        (h) => h._id === selectedHospitalId && !h.isDeleted && h.status !== 'DELETED'
      );
      if (!isCurrentActive) {
        clearSelectedHospital();
      }
    }
  }, [selectedHospitalId, hospitals, clearSelectedHospital]);

  const handleToggle = () => {
    const nextState = !isOpen;
    if (nextState) {
      fetchHospitals();
    }
    setIsOpen(nextState);
  };

  const handleSelect = (hospital) => {
    if (!hospital) {
      clearSelectedHospital();
      setIsOpen(false);
      return;
    }
    setSelectedHospital(hospital._id, hospital.name);
    setIsOpen(false);
    if (window.location.pathname.includes('/admin/hospital/')) {
      const segment = window.location.pathname.split('/').slice(4).join('/') || 'dashboard';
      navigate(`/admin/hospital/${hospital._id}/${segment}`);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'
        }`}
      >
        {selectedHospitalId ? (
          <>
            <Building2 size={compact ? 14 : 16} className="text-indigo-600 shrink-0" />
            <span className="font-semibold text-slate-800 max-w-[140px] truncate">
              {selectedHospitalName || 'Hospital'}
            </span>
          </>
        ) : (
          <>
            <Globe size={compact ? 14 : 16} className="text-slate-500 shrink-0" />
            <span className="font-medium text-slate-600">All Hospitals</span>
          </>
        )}
        <ChevronDown size={14} className="text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div className="absolute top-full left-0 mt-1 w-72 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg z-50">
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100"
            >
              <Globe size={16} className="text-slate-500" />
              <span className="font-semibold text-slate-700">Platform Overview (All Hospitals)</span>
            </button>
            {activeHospitals.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400 text-center">
                No active hospitals found
              </div>
            ) : (
              activeHospitals.map((h) => (
                <button
                  key={h._id}
                  type="button"
                  onClick={() => handleSelect(h)}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-indigo-50 flex items-center gap-2 ${
                    selectedHospitalId === h._id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                  }`}
                >
                  <Building2 size={16} className={selectedHospitalId === h._id ? 'text-indigo-600' : 'text-slate-400'} />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{h.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{h.code} · {h.status}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
