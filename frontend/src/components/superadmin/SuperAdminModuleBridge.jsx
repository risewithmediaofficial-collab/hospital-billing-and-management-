import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSuperAdminContextStore } from '../../store/superAdminContextStore';
import { axiosClient } from '../../api/axiosClient';

/**
 * Sets hospital context from URL param and renders existing module components.
 * Does not modify the wrapped module — only provides tenant context via store + API header.
 */
export const SuperAdminHospitalContext = ({ children, hospitalId: propHospitalId }) => {
  const { hospitalId: paramHospitalId } = useParams();
  const hospitalId = propHospitalId || paramHospitalId;
  const navigate = useNavigate();
  const { setSelectedHospital, selectedHospitalId } = useSuperAdminContextStore();

  useEffect(() => {
    if (!hospitalId) return;

    const syncHospital = async () => {
      if (selectedHospitalId === hospitalId) return;
      try {
        const res = await axiosClient.get(`/saas/hospitals/${hospitalId}/detail`);
        const name = res.data?.hospital?.name || 'Hospital';
        setSelectedHospital(hospitalId, name);
      } catch {
        setSelectedHospital(hospitalId, 'Hospital');
      }
    };

    syncHospital();
  }, [hospitalId, selectedHospitalId, setSelectedHospital]);

  if (!hospitalId) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>No hospital selected.</p>
        <button
          type="button"
          onClick={() => navigate('/admin/hospitals')}
          className="mt-4 text-indigo-600 font-semibold hover:underline"
        >
          Browse Hospitals
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

/** Wraps an existing dashboard/module for Super Admin with optional hospital context */
export const SuperAdminModuleBridge = ({ children, requireHospital = false, hospitalId: propHospitalId }) => {
  const { hospitalId: paramHospitalId } = useParams();
  const { selectedHospitalId } = useSuperAdminContextStore();
  const navigate = useNavigate();
  const effectiveHospitalId = propHospitalId || paramHospitalId || selectedHospitalId;

  if (requireHospital && !effectiveHospitalId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-amber-800 font-semibold">Select a hospital to view this module</p>
        <p className="text-sm text-amber-600 mt-1">Use the hospital selector in the top bar, or open a hospital dashboard.</p>
        <button
          type="button"
          onClick={() => navigate('/admin/hospitals')}
          className="mt-4 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-bold hover:bg-amber-700"
        >
          View All Hospitals
        </button>
      </div>
    );
  }

  if (effectiveHospitalId) {
    return (
      <SuperAdminHospitalContext hospitalId={effectiveHospitalId}>
        {children}
      </SuperAdminHospitalContext>
    );
  }

  return <>{children}</>;
};
