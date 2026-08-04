import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const ROLE_DEFAULT_PATHS = {
  SUPER_ADMIN: '/admin/dashboard',
  HOSPITAL_ADMIN: '/hospital-admin/dashboard',
  DOCTOR: '/doctor/dashboard',
  NURSE: '/nursing/dashboard',
  NURSE_INCHARGE: '/nurse-incharge/dashboard',
  RECEPTIONIST: '/reception/dashboard',
  PHARMACIST: '/pharmacy/dashboard',
  LAB_TECH: '/laboratory/dashboard',
  RADIOLOGIST: '/radiology/dashboard',
  CASHIER: '/billing/dashboard',
  INVENTORY_MANAGER: '/inventory/dashboard',
  HR_MANAGER: '/hr/dashboard',
  PATIENT: '/patient-portal/dashboard',
  GUARDIAN: '/guardian-portal/dashboard',
};

export const ForbiddenPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleReturn = () => {
    const path = (user?.role ? ROLE_DEFAULT_PATHS[user.role] : null) || user?.defaultRoute || '/login';
    navigate(path, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mb-4">
        <ShieldAlert size={36} />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900">403 - Access Forbidden</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-md">
        Security Policy Exception: Your active user role does not have authorization to view this workstation route or dashboard.
      </p>
      <Button variant="primary" className="mt-6 font-bold cursor-pointer" onClick={handleReturn}>
        Return to Authorized Dashboard
      </Button>
    </div>
  );
};
